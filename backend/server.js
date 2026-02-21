const express = require("express");
const fs = require("fs/promises");
const http = require("http");
const multer = require("multer");
const path = require("path");
const socketIO = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { generateToken } = require("./auth");
const RoomManager = require("./rooms");
const WorkerBridge = require("./worker-bridge");
const RedisStore = require("./redis-store");
const FileManager = require("./file-manager");
const {
  COMMAND_TYPES,
  createCommand,
  OperationLogManager,
  deepClone
} = require("./undo-redo");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  allowEIO3: true
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const redis = new RedisStore();
const roomManager = new RoomManager(redis);
const workerBridge = new WorkerBridge();
const fileManager = new FileManager({
  storageRoot: process.env.FILE_STORAGE_PATH || path.join(process.cwd(), "backend", "storage"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  cdnBaseUrl: process.env.CDN_BASE_URL || ""
});

const operationLogs = new OperationLogManager({
  maxSteps: 100,
  maxTimeline: 500,
  mergeWindowMs: 500
});

const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024;
const ACCEPTED_UPLOAD_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"];

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadTempDir = path.join(fileManager.storageRoot, "tmp");
      try {
        await fs.mkdir(uploadTempDir, { recursive: true });
        cb(null, uploadTempDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const randomSuffix = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const extension = path.extname(file.originalname || "") || "";
      cb(null, `${randomSuffix}${extension}`);
    }
  }),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("仅支持 PNG/JPG/JPEG/PDF 文件"));
      return;
    }

    cb(null, true);
  }
});

// socket.id -> { id, roomId, username, position, rotation }
const users = new Map();
const chatHistoryByRoom = new Map();
const whiteboardLocksByRoom = new Map();
const MAX_CHAT_HISTORY = 50;
const WHITEBOARD_LOCK_TTL_MS = 4000;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(lowered)) return true;
    if (["0", "false", "no", "n"].includes(lowered)) return false;
  }
  return Boolean(value);
}

function normalizeUsername(name, fallback) {
  const trimmed = String(name || "").trim();
  return trimmed || fallback;
}

function getRoomHistory(roomId) {
  if (!chatHistoryByRoom.has(roomId)) {
    chatHistoryByRoom.set(roomId, []);
  }
  return chatHistoryByRoom.get(roomId);
}

function pushRoomHistory(roomId, message) {
  const history = getRoomHistory(roomId);
  history.push(message);
  if (history.length > MAX_CHAT_HISTORY) history.shift();
  return history;
}

function formatRoomUser(user, ownerId = null) {
  return {
    id: user.userId,
    userId: user.userId,
    socketId: user.socketId,
    username: user.username,
    role: ownerId && ownerId === user.userId ? "host" : "member",
    position: user.position || { x: 0, y: 1.6, z: 0 },
    rotation: user.rotation || { x: 0, y: 0, z: 0 }
  };
}

function getUserRole(room, userId) {
  if (!room || !userId) return "member";
  return room.ownerId && room.ownerId === userId ? "host" : "member";
}

function ensureLockMap(roomId) {
  if (!whiteboardLocksByRoom.has(roomId)) {
    whiteboardLocksByRoom.set(roomId, new Map());
  }
  return whiteboardLocksByRoom.get(roomId);
}

function getActiveWhiteboardLock(roomId, whiteboardId) {
  const locks = ensureLockMap(roomId);
  const lock = locks.get(String(whiteboardId || ""));
  if (!lock) return null;

  if (lock.expiresAt <= Date.now()) {
    locks.delete(String(whiteboardId || ""));
    return null;
  }

  return lock;
}

function lockWhiteboard(roomId, whiteboardId, userId, username, ttlMs = WHITEBOARD_LOCK_TTL_MS) {
  const key = String(whiteboardId || "");
  if (!key || !roomId || !userId) {
    return { ok: false, reason: "invalid" };
  }

  const locks = ensureLockMap(roomId);
  const current = getActiveWhiteboardLock(roomId, key);
  const now = Date.now();

  if (current && current.userId !== userId) {
    return {
      ok: false,
      reason: "locked",
      lock: current
    };
  }

  const lock = {
    whiteboardId: key,
    userId,
    username,
    acquiredAt: now,
    expiresAt: now + Math.max(500, Number(ttlMs) || WHITEBOARD_LOCK_TTL_MS)
  };

  locks.set(key, lock);
  return { ok: true, lock };
}

function unlockWhiteboard(roomId, whiteboardId, userId, force = false) {
  const key = String(whiteboardId || "");
  const locks = ensureLockMap(roomId);
  const current = getActiveWhiteboardLock(roomId, key);
  if (!current) return { ok: true, released: false };

  if (!force && current.userId !== userId) {
    return { ok: false, reason: "not-owner", lock: current };
  }

  locks.delete(key);
  return { ok: true, released: true, lock: current };
}

function releaseUserWhiteboardLocks(roomId, userId) {
  if (!roomId || !userId) return;
  const locks = ensureLockMap(roomId);
  for (const [whiteboardId, lock] of locks.entries()) {
    if (lock.userId === userId) {
      locks.delete(whiteboardId);
      io.to(roomId).emit("whiteboard:lock", {
        whiteboardId,
        locked: false,
        userId
      });
    }
  }
}

function parseMaybeJSON(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function parseVector3(value, fallback = { x: 0, y: 0, z: 0 }) {
  const parsed = parseMaybeJSON(value);
  if (!parsed || typeof parsed !== "object") return deepClone(fallback);

  const x = Number(parsed.x);
  const y = Number(parsed.y);
  const z = Number(parsed.z);

  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    z: Number.isFinite(z) ? z : fallback.z
  };
}

function buildMediaPlanePayload(fileMeta, actorId, spawnPosition, spawnRotation, spawnScale) {
  const width = Number(fileMeta?.dimensions?.width || 1280);
  const height = Number(fileMeta?.dimensions?.height || (fileMeta?.type === "pdf" ? 1810 : 720));
  const aspectRatio = height > 0 ? width / height : 16 / 9;

  const worldWidth = 2.4;
  const worldHeight = Number.isFinite(aspectRatio) && aspectRatio > 0
    ? Math.max(1.2, worldWidth / aspectRatio)
    : 1.4;

  return {
    id: `media_${fileMeta.id}`,
    type: "media-plane",
    mediaType: fileMeta.type,
    fileId: fileMeta.id,
    name: fileMeta.originalName,
    sourceUrl: fileMeta.urls.optimized || fileMeta.urls.content,
    contentUrl: fileMeta.urls.content,
    thumbnailUrl: fileMeta.urls.thumbnail,
    pdfUrl: fileMeta.type === "pdf" ? fileMeta.urls.content : null,
    aspectRatio,
    worldWidth,
    worldHeight,
    position: spawnPosition,
    rotation: spawnRotation,
    scale: spawnScale,
    color: 0xffffff,
    createdBy: actorId || null,
    metadata: {
      uploaderId: fileMeta.uploaderId,
      uploaderName: fileMeta.uploaderName,
      createdAt: fileMeta.createdAt
    }
  };
}

function getCurrentRoomId(socket) {
  return socket.data?.currentRoom || null;
}

function emitPublicRoomList(targetSocket = null) {
  const payload = roomManager.getRoomList(false);
  if (targetSocket) {
    targetSocket.emit("room-list", payload);
    return;
  }
  io.emit("room-list", payload);
}

function pickPatchFromObject(object, keys = []) {
  const patch = {};
  keys.forEach((key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      patch[key] = deepClone(object[key]);
    }
  });
  return patch;
}

function buildCommandContext(roomId, defaultActorId) {
  return {
    getObject: async (objectId) => roomManager.getObject(roomId, objectId),
    upsertObject: async (object, actorId = defaultActorId) =>
      roomManager.upsertObject(roomId, object, actorId),
    updateObject: async (objectId, updates, actorId = defaultActorId) =>
      roomManager.updateObject(roomId, objectId, updates, actorId),
    removeObject: async (objectId) => roomManager.removeObject(roomId, objectId),
    clearObjects: async () => roomManager.clearObjects(roomId),
    restoreObjects: async (objects, actorId = defaultActorId) => {
      for (const object of objects || []) {
        await roomManager.upsertObject(roomId, object, actorId);
      }
    }
  };
}

function emitUserOperationHistory(socket, roomId) {
  if (!roomId) return;

  socket.emit("operation:history", operationLogs.getHistory(roomId, socket.userId));
  socket.emit("operation:timeline", operationLogs.getRoomTimeline(roomId, 80));
}

function emitRoomOperationTimeline(roomId) {
  if (!roomId) return;
  io.to(roomId).emit("operation:timeline", operationLogs.getRoomTimeline(roomId, 80));
}

function broadcastCommandEffect(roomId, command, mode = "execute") {
  if (!roomId || !command) return;

  const direction = mode === "undo" ? "undo" : "execute";

  switch (command.type) {
    case COMMAND_TYPES.CREATE_OBJECT: {
      if (direction === "undo") {
        io.to(roomId).emit("object-deleted", { objectId: command.objectId });
      } else {
        io.to(roomId).emit("object-created", deepClone(command.after));
      }
      break;
    }

    case COMMAND_TYPES.DELETE_OBJECT: {
      if (direction === "undo") {
        io.to(roomId).emit("object-created", deepClone(command.before));
      } else {
        io.to(roomId).emit("object-deleted", { objectId: command.objectId });
      }
      break;
    }

    case COMMAND_TYPES.UPDATE_OBJECT: {
      const updates = direction === "undo" ? command.before : command.after;
      if (!updates) break;

      io.to(roomId).emit("object-updated", {
        objectId: command.objectId,
        updates: deepClone(updates)
      });

      if (updates.position) {
        io.to(roomId).emit("object-moved", {
          objectId: command.objectId,
          position: deepClone(updates.position)
        });
      }
      break;
    }

    case COMMAND_TYPES.CLEAR_OBJECTS: {
      if (direction === "undo") {
        io.to(roomId).emit("objects-restored", {
          objects: Array.isArray(command.before) ? deepClone(command.before) : []
        });
      } else {
        io.to(roomId).emit("object-deleted-all");
      }
      break;
    }

    default:
      break;
  }
}

async function leaveCurrentRoom(socket, options = {}) {
  const roomId = getCurrentRoomId(socket);
  if (!roomId) return;

  releaseUserWhiteboardLocks(roomId, socket.userId);

  socket.leave(roomId);
  socket.data.currentRoom = null;

  await roomManager.leaveRoom(roomId, socket.userId);

  const trackedUser = users.get(socket.id);
  if (trackedUser) {
    trackedUser.roomId = null;
    users.set(socket.id, trackedUser);
  }

  if (!options.silent) {
    socket.to(roomId).emit("user-left", socket.userId);

    const room = await roomManager.getRoom(roomId);
    const roomUsers = roomManager
      .getRoomUsers(roomId)
      .map((user) => formatRoomUser(user, room?.ownerId));
    io.to(roomId).emit("room-users", roomUsers);

    const leaveMsg = {
      type: "system",
      text: `${socket.username} left`,
      timestamp: Date.now()
    };
    pushRoomHistory(roomId, leaveMsg);
    io.to(roomId).emit("chat:message", leaveMsg);

    await redis.recordEvent(roomId, {
      type: "leave",
      userId: socket.userId,
      username: socket.username
    });
  }

  if (!roomManager.rooms.has(roomId)) {
    operationLogs.clearRoom(roomId);
    whiteboardLocksByRoom.delete(roomId);
  }

  emitPublicRoomList();
}

// Initialize
(async () => {
  await redis.connect();
  await fileManager.init();
  workerBridge.start();
})();

// Health check endpoints
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "XR Collab Backend Running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const token = generateToken(userId, username);
  res.json({ token, userId, username });
});

// Room endpoints
app.get("/api/rooms", (req, res) => {
  res.json(roomManager.getRoomList(false));
});

app.post("/api/rooms", async (req, res) => {
  const { roomId, name, password, maxUsers, persistent, isPublic, visibility } =
    req.body || {};

  try {
    const room = await roomManager.createRoom({
      roomId,
      name,
      password,
      maxUsers,
      persistent: parseBoolean(persistent, false),
      isPublic: visibility === "private" ? false : parseBoolean(isPublic, true),
      ownerId: null
    });

    const summary = roomManager.getRoomSummary(room);
    emitPublicRoomList();

    res.json({
      ...summary,
      inviteCode: room.id
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/rooms/:roomId/replay", async (req, res) => {
  const { roomId } = req.params;
  const fromTime = parseInt(req.query.from, 10) || 0;
  const events = await redis.getReplay(roomId, fromTime);
  res.json(events);
});

app.get("/api/rooms/:roomId/files", async (req, res) => {
  const roomId = roomManager.normalizeRoomId(req.params.roomId);
  if (!roomId) {
    res.status(400).json({ error: "roomId is required" });
    return;
  }

  const room = await roomManager.getRoom(roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const files = fileManager.listRoomFiles(roomId);
  res.json({ roomId, files });
});

app.post("/api/files/upload", (req, res) => {
  upload.single("file")(req, res, async (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "文件大小超过 100MB 限制"
          : error.message || "文件上传失败";

      res.status(400).json({ error: message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "请选择要上传的文件" });
      return;
    }

    const roomId = roomManager.normalizeRoomId(req.body.roomId);
    if (!roomId) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        // ignore
      }
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        // ignore
      }
      res.status(404).json({ error: "Room not found" });
      return;
    }

    try {
      const uploaderId = String(req.body.uploaderId || "unknown");
      const uploaderName = String(req.body.uploaderName || "用户");

      const fileMeta = await fileManager.saveUpload({
        roomId,
        uploaderId,
        uploaderName,
        tempPath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      });

      const spawnPosition = parseVector3(req.body.spawnPosition, { x: 0, y: 1.6, z: -2.4 });
      const spawnRotation = parseVector3(req.body.spawnRotation, { x: 0, y: 0, z: 0 });
      const spawnScale = parseVector3(req.body.spawnScale, { x: 1, y: 1, z: 1 });

      const mediaObjectPayload = buildMediaPlanePayload(
        fileMeta,
        uploaderId,
        spawnPosition,
        spawnRotation,
        spawnScale
      );

      const mediaObject = await roomManager.upsertObject(roomId, mediaObjectPayload, uploaderId);
      await fileManager.linkObject(fileMeta.id, mediaObject.id);

      io.to(roomId).emit("file:uploaded", {
        ...fileMeta,
        objectId: mediaObject.id
      });
      io.to(roomId).emit("object-created", mediaObject);

      await redis.recordEvent(roomId, {
        type: "file-upload",
        userId: uploaderId,
        fileId: fileMeta.id,
        objectId: mediaObject.id,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size
      });

      res.status(201).json({
        success: true,
        file: {
          ...fileMeta,
          objectId: mediaObject.id
        },
        object: mediaObject
      });
    } catch (uploadError) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        // ignore
      }

      res.status(500).json({ error: uploadError.message || "文件上传失败" });
    }
  });
});

app.get("/api/files/:fileId", (req, res) => {
  const fileMeta = fileManager.getFile(req.params.fileId);
  if (!fileMeta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(fileMeta);
});

app.get("/api/files/:fileId/content", async (req, res) => {
  const target = fileManager.getVariantPath(req.params.fileId, "content");
  if (!target) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type(target.contentType || "application/octet-stream");
  res.sendFile(path.resolve(target.path));
});

app.get("/api/files/:fileId/optimized", async (req, res) => {
  const target = fileManager.getVariantPath(req.params.fileId, "optimized");
  if (!target) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type(target.contentType || "application/octet-stream");
  res.sendFile(path.resolve(target.path));
});

app.get("/api/files/:fileId/thumbnail", async (req, res) => {
  const target = fileManager.getVariantPath(req.params.fileId, "thumbnail");
  if (!target) {
    res.status(404).json({ error: "File preview not found" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type(target.contentType || "application/octet-stream");
  res.sendFile(path.resolve(target.path));
});

app.delete("/api/files/:fileId", async (req, res) => {
  const fileMeta = fileManager.getFile(req.params.fileId);
  if (!fileMeta) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const roomId = roomManager.normalizeRoomId(
    req.body?.roomId || req.query.roomId || fileMeta.roomId
  );
  const room = await roomManager.getRoom(roomId);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const requesterId = String(req.body?.requesterId || req.query.requesterId || "");
  const canDelete = fileManager.canDelete(fileMeta.id, requesterId, room.ownerId);

  if (!canDelete) {
    res.status(403).json({ error: "无权限删除该文件（仅上传者或主持人可删除）" });
    return;
  }

  const deletedMeta = await fileManager.deleteFile(fileMeta.id);

  if (deletedMeta?.objectId) {
    await roomManager.removeObject(roomId, deletedMeta.objectId);
    io.to(roomId).emit("object-deleted", { objectId: deletedMeta.objectId });
  }

  io.to(roomId).emit("file:deleted", {
    fileId: deletedMeta.id,
    objectId: deletedMeta.objectId,
    deletedBy: requesterId
  });

  await redis.recordEvent(roomId, {
    type: "file-delete",
    userId: requesterId,
    fileId: deletedMeta.id,
    objectId: deletedMeta.objectId
  });

  res.json({ success: true, fileId: deletedMeta.id });
});

// Worker endpoints
app.post("/api/worker/execute", async (req, res) => {
  try {
    const result = await workerBridge.execute(req.body.task, req.body.data);
    res.json(result);
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});

app.get("/api/worker/status", (req, res) => {
  res.json(workerBridge.getStatus());
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    users: users.size,
    rooms: roomManager.rooms.size,
    redis: redis.enabled,
    workers: workerBridge.getStatus(),
    files: fileManager.getStats()
  });
});

// Socket.IO with optional auth (allow anonymous)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    socket.userId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    socket.username =
      socket.handshake.auth.username || `访客_${socket.id.slice(0, 4)}`;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "xr-collab-secret"
    );
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    socket.userId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    socket.username = `访客_${socket.id.slice(0, 4)}`;
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`✅ ${socket.username} connected`);

  users.set(socket.id, {
    id: socket.userId,
    socketId: socket.id,
    username: socket.username,
    roomId: null,
    position: { x: 0, y: 1.6, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  });

  emitPublicRoomList(socket);

  socket.on("user:set-name", (payload = {}) => {
    socket.username = normalizeUsername(payload.username, socket.username);
    const user = users.get(socket.id);
    if (user) {
      user.username = socket.username;
      users.set(socket.id, user);
    }
  });

  socket.on("room:list", () => {
    emitPublicRoomList(socket);
  });

  const handleCreateRoom = async (payload = {}) => {
    try {
      const room = await roomManager.createRoom({
        roomId: payload.roomId,
        name: payload.name,
        password: payload.password,
        maxUsers: payload.maxUsers,
        persistent: parseBoolean(payload.persistent, false),
        isPublic:
          payload.visibility === "private"
            ? false
            : parseBoolean(payload.isPublic, true),
        ownerId: socket.userId
      });

      const summary = roomManager.getRoomSummary(room);
      socket.emit("room-created", summary);
      emitPublicRoomList();
    } catch (error) {
      socket.emit("room-error", { message: error.message });
    }
  };

  socket.on("room:create", handleCreateRoom);
  socket.on("create-room", handleCreateRoom);

  const handleJoinRoom = async (data = {}) => {
    const incomingRoomId = roomManager.normalizeRoomId(data.roomId);
    if (!incomingRoomId) {
      socket.emit("room-error", { message: "Room ID required" });
      return;
    }

    if (data.username) {
      socket.username = normalizeUsername(data.username, socket.username);
    }

    try {
      const previousRoomId = getCurrentRoomId(socket);
      if (previousRoomId && previousRoomId !== incomingRoomId) {
        await leaveCurrentRoom(socket);
      }

      const trackedUser = users.get(socket.id) || {
        id: socket.userId,
        socketId: socket.id,
        username: socket.username,
        position: { x: 0, y: 1.6, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      };

      const room = await roomManager.joinRoom(
        incomingRoomId,
        socket.userId,
        {
          username: socket.username,
          socketId: socket.id,
          position: trackedUser.position,
          rotation: trackedUser.rotation
        },
        data.password
      );

      socket.join(room.id);
      socket.data.currentRoom = room.id;

      users.set(socket.id, {
        ...trackedUser,
        id: socket.userId,
        username: socket.username,
        roomId: room.id
      });

      const joinedUser = {
        id: socket.userId,
        userId: socket.userId,
        socketId: socket.id,
        username: socket.username,
        role: getUserRole(room, socket.userId),
        position: trackedUser.position,
        rotation: trackedUser.rotation
      };

      const roomUsers = roomManager
        .getRoomUsers(room.id)
        .map((user) => formatRoomUser(user, room.ownerId));
      const roomObjects = roomManager.getRoomObjects(room.id);
      const roomWhiteboards = roomManager.getRoomWhiteboards(room.id);
      const roomFiles = fileManager.listRoomFiles(room.id);
      const history = getRoomHistory(room.id);

      const selfRole = getUserRole(room, socket.userId);

      socket.emit("room:joined", {
        room: roomManager.getRoomSummary(room),
        role: selfRole,
        users: roomUsers,
        objects: roomObjects,
        whiteboards: roomWhiteboards,
        files: roomFiles,
        history
      });

      socket.emit("whiteboard:permission", {
        roomId: room.id,
        role: selfRole,
        ownerId: room.ownerId,
        userId: socket.userId
      });

      // Backward compatibility
      socket.emit("room-users", roomUsers);
      socket.emit("room-objects", roomObjects);
      socket.emit("whiteboard:list", roomWhiteboards);
      socket.emit("file:list", roomFiles);
      socket.emit("chat:history", history);
      emitUserOperationHistory(socket, room.id);

      socket.to(room.id).emit("user-joined", joinedUser);
      io.to(room.id).emit("room-users", roomUsers);

      const joinMsg = {
        type: "system",
        text: `${socket.username} joined`,
        timestamp: Date.now()
      };
      pushRoomHistory(room.id, joinMsg);
      io.to(room.id).emit("chat:message", joinMsg);

      await redis.recordEvent(room.id, {
        type: "join",
        userId: socket.userId,
        username: socket.username
      });

      emitPublicRoomList();
      console.log(`${socket.username} joined room ${room.id}`);
    } catch (e) {
      socket.emit("room-error", { message: e.message });
      socket.emit("error", { message: e.message });
    }
  };

  socket.on("join-room", handleJoinRoom);
  socket.on("room:join", handleJoinRoom);

  socket.on("leave-room", async () => {
    await leaveCurrentRoom(socket);
    socket.emit("room:left", { success: true });
  });

  socket.on("room:leave", async () => {
    await leaveCurrentRoom(socket);
    socket.emit("room:left", { success: true });
  });

  socket.on("chat:send", (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.text) return;

    const msg = {
      type: "user",
      userId: socket.userId,
      username: socket.username,
      text: String(data.text).slice(0, 200),
      timestamp: Date.now()
    };

    pushRoomHistory(roomId, msg);
    io.to(roomId).emit("chat:message", msg);
  });

  socket.on("file:list", () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;
    socket.emit("file:list", fileManager.listRoomFiles(roomId));
  });

  socket.on("whiteboard:list", async () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const room = await roomManager.getRoom(roomId);
    socket.emit("whiteboard:list", roomManager.getRoomWhiteboards(roomId));
    socket.emit("whiteboard:permission", {
      roomId,
      role: getUserRole(room, socket.userId),
      ownerId: room?.ownerId || null,
      userId: socket.userId
    });
  });

  socket.on("file:delete", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const fileId = String(data.fileId || "");
    if (!fileId) return;

    const room = await roomManager.getRoom(roomId);
    const fileMeta = fileManager.getFile(fileId);
    if (!room || !fileMeta || fileMeta.roomId !== roomId) return;

    if (!fileManager.canDelete(fileId, socket.userId, room.ownerId)) {
      socket.emit("file:error", {
        fileId,
        message: "无权限删除该文件（仅上传者或主持人可删除）"
      });
      return;
    }

    const deletedMeta = await fileManager.deleteFile(fileId);

    if (deletedMeta?.objectId) {
      await roomManager.removeObject(roomId, deletedMeta.objectId);
      io.to(roomId).emit("object-deleted", { objectId: deletedMeta.objectId });
    }

    io.to(roomId).emit("file:deleted", {
      fileId: deletedMeta.id,
      objectId: deletedMeta.objectId,
      deletedBy: socket.userId
    });
  });

  socket.on("update-position", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const user = users.get(socket.id);
    if (!user) return;

    user.position = data.position || user.position;
    user.rotation = data.rotation || user.rotation;
    users.set(socket.id, user);

    await roomManager.updateUser(roomId, socket.userId, {
      position: user.position,
      rotation: user.rotation,
      username: socket.username,
      socketId: socket.id
    });

    socket.to(roomId).emit("user-moved", {
      userId: socket.userId,
      id: socket.userId,
      socketId: socket.id,
      position: user.position,
      rotation: user.rotation
    });

    await redis.recordEvent(roomId, {
      type: "move",
      userId: socket.userId,
      position: user.position,
      rotation: user.rotation
    });
  });

  const requireHostRole = async (roomId, action) => {
    const room = await roomManager.getRoom(roomId);
    if (!room) {
      socket.emit("whiteboard:error", { action, message: "Room not found" });
      return null;
    }

    if (getUserRole(room, socket.userId) !== "host") {
      socket.emit("whiteboard:error", {
        action,
        message: "仅主持人可执行该白板操作"
      });
      return null;
    }

    return room;
  };

  socket.on("whiteboard:lock", async (data = {}, ack) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) {
      if (typeof ack === "function") ack({ ok: false, reason: "invalid" });
      return;
    }

    const room = await roomManager.getRoom(roomId);
    if (!room) {
      if (typeof ack === "function") ack({ ok: false, reason: "room-not-found" });
      return;
    }

    const lockResult = lockWhiteboard(
      roomId,
      data.whiteboardId,
      socket.userId,
      socket.username,
      data.ttlMs
    );

    if (!lockResult.ok) {
      socket.emit("whiteboard:lock-denied", {
        whiteboardId: data.whiteboardId,
        lock: lockResult.lock || null
      });
      if (typeof ack === "function") ack(lockResult);
      return;
    }

    io.to(roomId).emit("whiteboard:lock", {
      whiteboardId: data.whiteboardId,
      locked: true,
      userId: socket.userId,
      username: socket.username,
      expiresAt: lockResult.lock.expiresAt
    });

    if (typeof ack === "function") ack(lockResult);
  });

  socket.on("whiteboard:unlock", (data = {}, ack) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) {
      if (typeof ack === "function") ack({ ok: false, reason: "invalid" });
      return;
    }

    const unlockResult = unlockWhiteboard(roomId, data.whiteboardId, socket.userId, Boolean(data.force));

    if (unlockResult.ok && unlockResult.released) {
      io.to(roomId).emit("whiteboard:lock", {
        whiteboardId: data.whiteboardId,
        locked: false,
        userId: socket.userId
      });
    }

    if (typeof ack === "function") ack(unlockResult);
  });

  socket.on("whiteboard:create", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const room = await requireHostRole(roomId, "create");
    if (!room) return;

    const whiteboard = await roomManager.upsertWhiteboard(roomId, data, socket.userId);
    if (!whiteboard) return;

    io.to(roomId).emit("whiteboard:create", whiteboard);

    await redis.recordEvent(roomId, {
      type: "whiteboard-create",
      userId: socket.userId,
      whiteboardId: whiteboard.id
    });
  });

  socket.on("whiteboard:delete", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    const room = await requireHostRole(roomId, "delete");
    if (!room) return;

    const removed = await roomManager.removeWhiteboard(roomId, data.whiteboardId);
    if (!removed) return;

    unlockWhiteboard(roomId, removed.id, socket.userId, true);
    io.to(roomId).emit("whiteboard:delete", { whiteboardId: removed.id });
  });

  socket.on("whiteboard:transform", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    const room = await requireHostRole(roomId, "transform");
    if (!room) return;

    const previous = await roomManager.getWhiteboard(roomId, data.whiteboardId);
    if (!previous) return;

    const merged = {
      ...previous,
      position: data.position || previous.position,
      rotation: data.rotation || previous.rotation,
      scale: data.scale || previous.scale
    };

    const updated = await roomManager.upsertWhiteboard(roomId, merged, socket.userId);
    if (!updated) return;

    io.to(roomId).emit("whiteboard:transform", {
      whiteboardId: updated.id,
      position: updated.position,
      rotation: updated.rotation,
      scale: updated.scale,
      updatedBy: socket.userId
    });
  });

  socket.on("whiteboard:draw", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId || !data.type) return;

    const activeLock = getActiveWhiteboardLock(roomId, data.whiteboardId);
    if (activeLock && activeLock.userId !== socket.userId) {
      socket.emit("whiteboard:lock-denied", {
        whiteboardId: data.whiteboardId,
        lock: activeLock
      });
      return;
    }

    const normalizedAction = {
      ...deepClone(data),
      userId: socket.userId,
      username: socket.username,
      timestamp: data.timestamp || Date.now()
    };

    const updated = await roomManager.appendWhiteboardAction(
      roomId,
      data.whiteboardId,
      normalizedAction,
      socket.userId
    );

    if (!updated) return;

    io.to(roomId).emit("whiteboard:draw", normalizedAction);

    await redis.recordEvent(roomId, {
      type: "whiteboard-draw",
      userId: socket.userId,
      whiteboardId: data.whiteboardId,
      drawType: data.type
    });
  });

  socket.on("whiteboard:cursor", (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    socket.to(roomId).emit("whiteboard:cursor", {
      ...deepClone(data),
      userId: socket.userId,
      username: socket.username,
      role: "member"
    });
  });

  socket.on("whiteboard:clear", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    const room = await requireHostRole(roomId, "clear");
    if (!room) return;

    const updated = await roomManager.appendWhiteboardAction(
      roomId,
      data.whiteboardId,
      {
        type: "CLEAR",
        whiteboardId: data.whiteboardId,
        userId: socket.userId,
        username: socket.username,
        timestamp: Date.now()
      },
      socket.userId
    );

    if (!updated) return;

    io.to(roomId).emit("whiteboard:history", {
      whiteboardId: data.whiteboardId,
      history: updated.history || []
    });
  });

  socket.on("whiteboard:undo", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    const activeLock = getActiveWhiteboardLock(roomId, data.whiteboardId);
    if (activeLock && activeLock.userId !== socket.userId) return;

    const updated = await roomManager.undoWhiteboardAction(roomId, data.whiteboardId, socket.userId);
    if (!updated) return;

    io.to(roomId).emit("whiteboard:history", {
      whiteboardId: data.whiteboardId,
      history: updated.history || []
    });
  });

  socket.on("whiteboard:redo", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId || !data.whiteboardId) return;

    const activeLock = getActiveWhiteboardLock(roomId, data.whiteboardId);
    if (activeLock && activeLock.userId !== socket.userId) return;

    const updated = await roomManager.redoWhiteboardAction(roomId, data.whiteboardId, socket.userId);
    if (!updated) return;

    io.to(roomId).emit("whiteboard:history", {
      whiteboardId: data.whiteboardId,
      history: updated.history || []
    });
  });

  socket.on("object-create", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const payload = {
      ...data,
      id:
        data.id ||
        data.objectId ||
        `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };

    const createdObject = await roomManager.upsertObject(roomId, payload, socket.userId);

    const command = createCommand({
      type: COMMAND_TYPES.CREATE_OBJECT,
      roomId,
      userId: socket.userId,
      objectId: createdObject.id,
      before: null,
      after: createdObject,
      meta: {
        action: "object-create"
      }
    });

    const history = operationLogs.record(roomId, socket.userId, command);

    io.to(roomId).emit("object-created", createdObject);
    socket.emit("operation:history", history);
    emitRoomOperationTimeline(roomId);

    await redis.recordEvent(roomId, {
      type: "object-create",
      userId: socket.userId,
      objectId: createdObject.id,
      commandId: command.id
    });
  });

  socket.on("object-delete", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const { objectId } = data;
    if (!objectId) return;

    const previousObject = await roomManager.getObject(roomId, objectId);
    if (!previousObject) return;

    await roomManager.removeObject(roomId, objectId);

    const command = createCommand({
      type: COMMAND_TYPES.DELETE_OBJECT,
      roomId,
      userId: socket.userId,
      objectId,
      before: previousObject,
      after: null,
      meta: {
        action: "object-delete"
      }
    });

    const history = operationLogs.record(roomId, socket.userId, command);

    io.to(roomId).emit("object-deleted", { objectId });
    socket.emit("operation:history", history);
    emitRoomOperationTimeline(roomId);

    await redis.recordEvent(roomId, {
      type: "object-delete",
      userId: socket.userId,
      objectId,
      commandId: command.id
    });
  });

  socket.on("object-delete-all", async () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const removedObjects = await roomManager.clearObjects(roomId);

    const command = createCommand({
      type: COMMAND_TYPES.CLEAR_OBJECTS,
      roomId,
      userId: socket.userId,
      objectId: null,
      before: removedObjects,
      after: [],
      meta: {
        action: "object-delete-all",
        objectCount: removedObjects.length
      }
    });

    const history = operationLogs.record(roomId, socket.userId, command);

    io.to(roomId).emit("object-deleted-all");
    socket.emit("operation:history", history);
    emitRoomOperationTimeline(roomId);

    await redis.recordEvent(roomId, {
      type: "object-delete-all",
      userId: socket.userId,
      commandId: command.id,
      objectCount: removedObjects.length
    });
  });

  socket.on("object-move", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const { objectId, position, transient } = data;
    if (!objectId || !position) return;

    const previousObject = await roomManager.getObject(roomId, objectId);
    if (!previousObject) return;

    const updatedObject = await roomManager.moveObject(
      roomId,
      objectId,
      position,
      socket.userId
    );

    io.to(roomId).emit("object-moved", { objectId, position });

    if (transient) return;

    const command = createCommand({
      type: COMMAND_TYPES.UPDATE_OBJECT,
      roomId,
      userId: socket.userId,
      objectId,
      before: { position: previousObject.position },
      after: { position: updatedObject.position },
      meta: {
        action: "object-move",
        mergeKey: `transform:${objectId}`
      }
    });

    const history = operationLogs.record(roomId, socket.userId, command);
    socket.emit("operation:history", history);
    emitRoomOperationTimeline(roomId);

    await redis.recordEvent(roomId, {
      type: "object-move",
      userId: socket.userId,
      objectId,
      position,
      commandId: command.id
    });
  });

  const handleObjectUpdate = async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const objectId = data.objectId;
    const updates = data.updates || data.after || {};
    if (!objectId || typeof updates !== "object") return;

    const keys = Object.keys(updates);
    if (!keys.length) return;

    const previousObject = await roomManager.getObject(roomId, objectId);
    if (!previousObject) return;

    const updatedObject = await roomManager.updateObject(
      roomId,
      objectId,
      updates,
      socket.userId
    );

    if (!updatedObject) return;

    const beforePatch =
      data.before && typeof data.before === "object"
        ? deepClone(data.before)
        : pickPatchFromObject(previousObject, keys);

    const afterPatch = pickPatchFromObject(updatedObject, keys);

    const command = createCommand({
      type: COMMAND_TYPES.UPDATE_OBJECT,
      roomId,
      userId: socket.userId,
      objectId,
      before: beforePatch,
      after: afterPatch,
      meta: {
        action: data.action || "object-update",
        mergeKey: data.meta?.mergeKey || null
      }
    });

    const history = operationLogs.record(roomId, socket.userId, command);

    io.to(roomId).emit("object-updated", {
      objectId,
      updates: afterPatch,
      actorId: socket.userId
    });

    if (afterPatch.position) {
      io.to(roomId).emit("object-moved", {
        objectId,
        position: afterPatch.position
      });
    }

    socket.emit("operation:history", history);
    emitRoomOperationTimeline(roomId);

    await redis.recordEvent(roomId, {
      type: "object-update",
      userId: socket.userId,
      objectId,
      keys,
      commandId: command.id
    });
  };

  socket.on("object-update", handleObjectUpdate);
  socket.on("object-transform", handleObjectUpdate);

  socket.on("operation:undo", async () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const context = buildCommandContext(roomId, socket.userId);
    const result = await operationLogs.undo(roomId, socket.userId, context);

    if (!result.ok) {
      socket.emit("operation:error", { message: "没有可撤销的操作" });
      return;
    }

    broadcastCommandEffect(roomId, result.command, "undo");
    socket.emit("operation:history", result.history);
    emitRoomOperationTimeline(roomId);

    if (result.conflict) {
      socket.emit("operation:conflict", {
        ...result.conflict,
        commandType: result.command.type,
        commandId: result.command.id,
        message:
          result.conflict.message ||
          "检测到冲突：该对象已被他人修改，已按最后写入胜出策略覆盖"
      });
    }

    await redis.recordEvent(roomId, {
      type: "operation-undo",
      userId: socket.userId,
      commandId: result.command.id,
      commandType: result.command.type,
      objectId: result.command.objectId,
      conflict: Boolean(result.conflict)
    });
  });

  socket.on("operation:redo", async () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const context = buildCommandContext(roomId, socket.userId);
    const result = await operationLogs.redo(roomId, socket.userId, context);

    if (!result.ok) {
      socket.emit("operation:error", { message: "没有可重做的操作" });
      return;
    }

    broadcastCommandEffect(roomId, result.command, "execute");
    socket.emit("operation:history", result.history);
    emitRoomOperationTimeline(roomId);

    if (result.conflict) {
      socket.emit("operation:conflict", {
        ...result.conflict,
        commandType: result.command.type,
        commandId: result.command.id,
        message:
          result.conflict.message ||
          "检测到冲突：该对象已被他人修改，已按最后写入胜出策略覆盖"
      });
    }

    await redis.recordEvent(roomId, {
      type: "operation-redo",
      userId: socket.userId,
      commandId: result.command.id,
      commandType: result.command.type,
      objectId: result.command.objectId,
      conflict: Boolean(result.conflict)
    });
  });

  socket.on("operation:history", () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;
    emitUserOperationHistory(socket, roomId);
  });

  const handleComputeTask = async (data = {}) => {
    const task = data.task || data.type;
    const payload = data.payload || data.data;

    if (!task) {
      socket.emit("compute-result", {
        taskId: data.taskId,
        status: "failed",
        error: "Task type is required"
      });
      return;
    }

    try {
      const result = await workerBridge.execute(task, payload);
      socket.emit("compute-result", {
        taskId: data.taskId,
        status: "completed",
        result
      });

      socket.emit("worker-result", { taskId: data.taskId, result });
    } catch (e) {
      socket.emit("compute-result", {
        taskId: data.taskId,
        status: "failed",
        error: e.message
      });

      socket.emit("worker-error", { taskId: data.taskId, error: e.message });
    }
  };

  socket.on("compute-task", handleComputeTask);
  socket.on("worker-task", handleComputeTask);

  socket.on("disconnect", async () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`❌ ${user.username} disconnected`);
      await leaveCurrentRoom(socket);
    }

    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 XR Collab server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  workerBridge.stop();
  server.close();
});
