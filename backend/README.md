# WebXR Backend - Production Ready

## Features Implemented

### ✅ BE-002: JWT Authentication System
- Token generation and verification
- Socket.IO authentication middleware
- Secure user identification

### ✅ BE-003: Enhanced Room Management
- Room creation with options (maxUsers, persistent)
- User join/leave tracking
- Object persistence per room
- Redis-backed room state

### ✅ BE-007: Worker Bridge Layer
- Load balancing between Railway and Koyeb workers
- Health checks every 30s
- Automatic failover
- Task execution with retry logic

### ✅ BE-006: Redis Persistence & Replay
- Event recording (join, leave, move, object-create)
- 24h TTL for replay data
- Replay API endpoint
- Graceful degradation if Redis unavailable

## Setup

```bash
npm install
cp backend/.env.example backend/.env
# Edit .env with your Redis URL and JWT secret
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Get JWT token

### Rooms
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:roomId/replay` - Get replay events

### Workers
- `POST /api/worker/execute` - Execute task on worker
- `GET /api/worker/status` - Worker health status

### Health
- `GET /api/health` - System health check

## Socket.IO Events

### Client → Server
- `join-room` - Join a room (requires auth)
- `update-position` - Update user position/rotation
- `object-create` - Create object in room
- `worker-task` - Execute worker task

### Server → Client
- `user-joined` - New user joined
- `user-left` - User left
- `user-moved` - User position updated
- `object-created` - Object created
- `room-users` - Current room users
- `worker-result` - Worker task result
- `worker-error` - Worker task error

## Environment Variables

- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection URL (optional)
- `NODE_ENV` - Environment (production/development)

## Architecture

```
backend/
├── server.js          # Main server with Socket.IO
├── auth.js            # JWT authentication
├── rooms.js           # Room management
├── worker-bridge.js   # Worker load balancer
└── redis-store.js     # Redis persistence layer
```
