const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const { generateToken, authMiddleware } = require("./auth");
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
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Health check endpoint
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

const redis = new RedisStore();
const roomManager = new RoomManager(redis);
const workerBridge = new WorkerBridge();
const users = new Map();

// Initialize
(async () => {
  await redis.connect();
  workerBridge.start();
})();

// Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const token = generateToken(userId, username);
  res.json({ token, userId, username });
});

// Room endpoints
app.get("/api/rooms", (req, res) => {
  res.json(roomManager.getRoomList());
});

app.post("/api/rooms", async (req, res) => {
  const { roomId, maxUsers, persistent } = req.body;
  if (!roomId) return res.status(400).json({ error: "roomId required" });
  
  try {
    const room = await roomManager.createRoom(roomId, { maxUsers, persistent });
    res.json({ id: room.id, created: room.created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/rooms/:roomId/replay", async (req, res) => {
  const { roomId } = req.params;
  const fromTime = parseInt(req.query.from) || 0;
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
    // 允许匿名连接，生成临时用户
    socket.userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    socket.username = socket.handshake.auth.username || `访客_${socket.id.slice(0, 4)}`;
    return next();
  }
  
  // 如果有token，验证它
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xr-collab-secret');
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    // Token无效，仍然允许作为访客
    socket.userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    socket.username = `访客_${socket.id.slice(0, 4)}`;
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`✅ ${socket.username} connected`);
  
  socket.on("join-room", async (data) => {
    const { roomId } = data;
    
    try {
      const room = await roomManager.joinRoom(roomId, socket.userId, {
        username: socket.username,
        socketId: socket.id
      });
      
      socket.join(roomId);
      
      const user = {
        id: socket.userId,
        socketId: socket.id,
        username: socket.username,
        position: { x: 0, y: 1.6, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      };
      
      users.set(socket.id, user);
      socket.to(roomId).emit("user-joined", user);
      
      const roomUsers = Array.from(room.users)
        .map(uid => Array.from(users.values()).find(u => u.id === uid))
        .filter(u => u);
      socket.emit("room-users", roomUsers);
      
      await redis.recordEvent(roomId, { type: 'join', userId: socket.userId, username: socket.username });
      
      console.log(`${socket.username} joined room ${roomId}`);
    } catch (e) {
      socket.emit("error", { message: e.message });
    }
  });
  
  socket.on("update-position", async (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    user.position = data.position;
    user.rotation = data.rotation;
    
    socket.rooms.forEach(async room => {
      if (room !== socket.id) {
        socket.to(room).emit("user-moved", {
          id: socket.userId,
          socketId: socket.id,
          position: data.position,
          rotation: data.rotation
        });
        await redis.recordEvent(room, { type: 'move', userId: socket.userId, ...data });
      }
    });
  });
  
  socket.on("object-create", async (data) => {
    socket.rooms.forEach(async room => {
      if (room !== socket.id) {
        socket.to(room).emit("object-created", data);
        await roomManager.addObject(room, data);
        await redis.recordEvent(room, { type: 'object-create', userId: socket.userId, ...data });
      }
    });
  });
  
  socket.on("worker-task", async (data) => {
    try {
      const result = await workerBridge.execute(data.task, data.payload);
      socket.emit("worker-result", { taskId: data.taskId, result });
    } catch (e) {
      socket.emit("worker-error", { taskId: data.taskId, error: e.message });
    }
  });
  
  socket.on("disconnect", async () => {
    const user = users.get(socket.id);
    if (!user) return;
    
    console.log(`❌ ${user.username} disconnected`);
    
    socket.rooms.forEach(async room => {
      if (room !== socket.id) {
        socket.to(room).emit("user-left", socket.userId);
        await roomManager.leaveRoom(room, socket.userId);
        await redis.recordEvent(room, { type: 'leave', userId: socket.userId });
      }
    });
    
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 XR Collab server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  workerBridge.stop();
  server.close();
});
