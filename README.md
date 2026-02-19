# WebXR Real-time Collaboration Platform

Production-grade AR/VR/XR collaboration platform with distributed Python workers.

## Architecture

- **Frontend**: Three.js + WebXR API
- **Backend**: Node.js + Socket.IO
- **Workers**: Python (Railway + Koyeb)
- **Real-time**: WebSocket-based state synchronization

## Features

- Multi-user real-time collaboration
- AR/VR/XR device support
- 3D scene rendering with Three.js
- Distributed Python workers for geometry computation
- Room-based collaboration
- Position and rotation synchronization

## Quick Start

```bash
npm install
npm start
```

Server runs on port 3001.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/rooms` - List active rooms

## Socket.IO Events

### Client → Server
- `join-room` - Join a collaboration room
- `update-position` - Update user position/rotation
- `object-create` - Create new 3D object

### Server → Client
- `user-joined` - New user joined room
- `room-users` - Current room users
- `user-moved` - User position updated
- `object-created` - New object created
- `user-left` - User left room

## Workers

- Railway: https://lightweight-distributed-ai-production.up.railway.app
- Koyeb: https://naughty-carina-risker666-8ce36d54.koyeb.app

## License

MIT
