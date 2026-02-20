# WebXR Real-time Collaboration Platform

Production-grade AR/VR/XR collaboration platform with distributed Python workers.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRisker-C%2Fxr-collab&root-directory=frontend)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Risker-C/xr-collab)

**部署指南**: [Render部署](DEPLOY_RENDER.md) | [完整部署指南](DEPLOYMENT_GUIDE.md) | [快速开始](DEPLOY_NOW.md)

## ✅ **STATUS: Complete & Production Ready!**

Full-stack WebXR collaboration platform with multi-agent development, ready for deployment.

**Quick Start**: See [DEPLOY_NOW.md](DEPLOY_NOW.md) for 5-minute deployment guide.

## Architecture

### Backend (Node.js + Socket.IO)
- ✅ JWT Authentication (BE-002)
- ✅ Enhanced Room Management (BE-003)  
- ✅ Worker Bridge to Railway/Koyeb (BE-007)
- ✅ Redis Persistence & Replay (BE-006)
- ✅ Winston Logging & Error Handling
- ✅ Docker Containerization

### Frontend (Three.js + WebXR)
- ✅ 3D scene rendering
- ✅ Real-time position sync
- ✅ Avatar system (head, body, nametag)
- ✅ XR controllers (dual-hand interaction)
- ✅ Collaboration UI (user list, controls)
- ✅ Worker integration (real-time results)

### Workers (Python - Railway + Koyeb)
- Railway: https://lightweight-distributed-ai-production.up.railway.app
- Koyeb: https://naughty-carina-risker666-8ce36d54.koyeb.app
- Load balancing + health checks
- Geometry computation & collision detection

## Features

### Backend
- Multi-user real-time collaboration
- JWT token-based authentication
- Room-based isolation with persistence
- Distributed worker integration
- Event replay (24h retention)
- Graceful degradation without Redis

### Frontend
- AR/VR/XR device support
- WebGL-based 3D rendering
- Position and rotation synchronization
- Object creation and manipulation

## Quick Start

### Development (with Docker Compose)
```bash
docker-compose up
```
Services:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000 (serve static files)
- Redis: localhost:6379

### Manual Setup
```bash
# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start Redis (required for persistence)
redis-server

# Start backend
npm start
```

Server runs on port 3001.

## API Endpoints

### HTTP
- `GET /api/health` - Health check
- `GET /api/rooms` - List active rooms
- `GET /api/replay/:roomId` - Get room event replay
- `POST /api/auth/token` - Generate JWT token

### Socket.IO Events

#### Client → Server
- `join-room` - Join a collaboration room (requires JWT)
- `update-position` - Update user position/rotation
- `object-create` - Create new 3D object
- `compute-task` - Submit task to workers

#### Server → Client
- `user-joined` - New user joined room
- `room-users` - Current room users
- `user-moved` - User position updated
- `object-created` - New object created
- `user-left` - User left room
- `compute-result` - Worker computation result

## Environment Variables

See `backend/.env.example` for full configuration options:
- JWT_SECRET - Secret for token signing
- REDIS_URL - Redis connection string
- RAILWAY_WORKER_URL - Railway worker endpoint
- KOYEB_WORKER_URL - Koyeb worker endpoint
- WORKER_HEALTH_INTERVAL - Health check interval (default: 30000ms)

## Production Deployment

### Docker
```bash
docker build -t xr-collab .
docker run -p 3001:3001 \
  -e REDIS_URL=redis://redis:6379 \
  -e JWT_SECRET=your-secret \
  xr-collab
```

### With Redis
```bash
docker-compose -f docker-compose.yml up -d
```

## Workers

Workers handle compute-intensive tasks:
- Geometry calculations
- Collision detection
- Path optimization
- Physics simulations

Tasks are load-balanced between Railway and Koyeb with automatic failover.

## License

MIT
