const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { generateToken } = require("./auth");
const RoomManager = require("./rooms");
const WorkerBridge = require("./worker-bridge");
const RedisStore = require("./redis-store");

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

// socket.id -> { id, roomId, username, position, rotation }
const users = new Map();
const chatHistoryByRoom = new Map();
const MAX_CHAT_HISTORY = 50;

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

function formatRoomUser(user) {
  return {
    id: user.userId,
    userId: user.userId,
    socketId: user.socketId,
    username: user.username,
    position: user.position || { x: 0, y: 1.6, z: 0 },
    rotation: user.rotation || { x: 0, y: 0, z: 0 }
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

async function leaveCurrentRoom(socket, options = {}) {
  const roomId = getCurrentRoomId(socket);
  if (!roomId) return;

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

    const roomUsers = roomManager.getRoomUsers(roomId).map(formatRoomUser);
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

  emitPublicRoomList();
}

// Initialize
(async () => {
  await redis.connect();
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
  const {
    roomId,
    name,
    password,
    maxUsers,
    persistent,
    isPublic,
    visibility
  } = req.body || {};

  try {
    const room = await roomManager.createRoom({
      roomId,
      name,
      password,
      maxUsers,
      persistent: parseBoolean(persistent, false),
      isPublic:
        visibility === "private"
          ? false
          : parseBoolean(isPublic, true),
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
    workers: workerBridge.getStatus()
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
        position: trackedUser.position,
        rotation: trackedUser.rotation
      };

      const roomUsers = roomManager.getRoomUsers(room.id).map(formatRoomUser);
      const roomObjects = roomManager.getRoomObjects(room.id);
      const history = getRoomHistory(room.id);

      socket.emit("room:joined", {
        room: roomManager.getRoomSummary(room),
        users: roomUsers,
        objects: roomObjects,
        history
      });

      // Backward compatibility
      socket.emit("room-users", roomUsers);
      socket.emit("room-objects", roomObjects);
      socket.emit("chat:history", history);

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

  socket.on("object-create", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const payload = {
      ...data,
      id: data.id || data.objectId || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };

    await roomManager.addObject(roomId, payload);
    socket.to(roomId).emit("object-created", payload);

    await redis.recordEvent(roomId, {
      type: "object-create",
      userId: socket.userId,
      ...payload
    });
  });

  socket.on("object-delete", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const { objectId } = data;
    if (!objectId) return;

    await roomManager.removeObject(roomId, objectId);
    socket.to(roomId).emit("object-deleted", { objectId });

    await redis.recordEvent(roomId, {
      type: "object-delete",
      userId: socket.userId,
      objectId
    });
  });

  socket.on("object-delete-all", async () => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    await roomManager.clearObjects(roomId);
    socket.to(roomId).emit("object-deleted-all");

    await redis.recordEvent(roomId, {
      type: "object-delete-all",
      userId: socket.userId
    });
  });

  socket.on("object-move", async (data = {}) => {
    const roomId = getCurrentRoomId(socket);
    if (!roomId) return;

    const { objectId, position } = data;
    if (!objectId || !position) return;

    await roomManager.moveObject(roomId, objectId, position);
    socket.to(roomId).emit("object-moved", { objectId, position });

    await redis.recordEvent(roomId, {
      type: "object-move",
      userId: socket.userId,
      objectId,
      position
    });
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
