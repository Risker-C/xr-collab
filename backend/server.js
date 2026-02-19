const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const users = new Map();
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("join-room", (data) => {
    const { roomId, username } = data;
    socket.join(roomId);
    
    const user = {
      id: socket.id,
      username,
      position: { x: 0, y: 1.6, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    };
    
    users.set(socket.id, user);
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);
    
    socket.to(roomId).emit("user-joined", user);
    
    const roomUsers = Array.from(rooms.get(roomId))
      .map(id => users.get(id)).filter(u => u);
    socket.emit("room-users", roomUsers);
    
    console.log(`${username} joined room ${roomId}`);
  });
  
  socket.on("update-position", (data) => {
    const user = users.get(socket.id);
    if (user) {
      user.position = data.position;
      user.rotation = data.rotation;
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit("user-moved", {
            id: socket.id,
            position: data.position,
            rotation: data.rotation
          });
        }
      });
    }
  });
  
  socket.on("object-create", (data) => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit("object-created", data);
      }
    });
  });
  
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      console.log("User disconnected:", user.username);
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit("user-left", socket.id);
          if (rooms.has(room)) rooms.get(room).delete(socket.id);
        }
      });
      users.delete(socket.id);
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", users: users.size, rooms: rooms.size });
});

app.get("/api/rooms", (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, userIds]) => ({
    id, users: userIds.size
  }));
  res.json(roomList);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 XR Collab server running on port ${PORT}`);
});
