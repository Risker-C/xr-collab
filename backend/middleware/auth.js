/**
 * Authentication and Authorization Middleware
 * 用于保护API端点和文件访问
 */

const jwt = require('jsonwebtoken');
const { getInstance: getStorageAdapter } = require('../storage/storage-adapter');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * 验证JWT token
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从存储中获取用户信息
    const storage = getStorageAdapter();
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * 验证房间成员权限
 */
const requireRoomMember = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    const userId = req.user?.id;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const storage = getStorageAdapter();
    const room = await storage.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // 检查用户是否是房间成员
    const isMember = room.users && room.users.some(u => u.id === userId);
    const isOwner = room.createdBy === userId;
    
    if (!isMember && !isOwner) {
      return res.status(403).json({ error: 'Access denied: Not a room member' });
    }

    req.room = room;
    next();
  } catch (error) {
    console.error('Room auth middleware error:', error);
    return res.status(500).json({ error: 'Room authorization failed' });
  }
};

/**
 * 验证房间所有者权限
 */
const requireRoomOwner = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    const userId = req.user?.id;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const storage = getStorageAdapter();
    const room = await storage.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied: Room owner required' });
    }

    req.room = room;
    next();
  } catch (error) {
    console.error('Room owner auth middleware error:', error);
    return res.status(500).json({ error: 'Room owner authorization failed' });
  }
};

/**
 * 可选认证（不强制要求token）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const storage = getStorageAdapter();
      const user = await storage.getUser(decoded.userId);
      
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // 忽略认证错误，继续处理请求
    next();
  }
};

/**
 * 生成JWT token
 */
const generateToken = (userId, expiresIn = '24h') => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
};

/**
 * 验证文件访问权限
 */
const requireFileAccess = async (req, res, next) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user?.id;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    // TODO: 从数据库获取文件信息和所属房间
    // 这里需要实现文件元数据存储
    // const file = await storage.getFile(fileId);
    // const roomId = file.roomId;
    
    // 临时实现：从URL路径获取roomId
    const roomId = req.params.roomId;
    if (roomId) {
      req.params.roomId = roomId;
      return requireRoomMember(req, res, next);
    }

    // 如果没有roomId，暂时允许访问（需要后续完善）
    console.warn(`File access without room check: ${fileId}`);
    next();
  } catch (error) {
    console.error('File access middleware error:', error);
    return res.status(500).json({ error: 'File access authorization failed' });
  }
};

/**
 * 速率限制中间件
 */
const createRateLimit = (maxRequests = 60, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      const storage = getStorageAdapter();
      const key = `${req.ip}:${req.path}`;
      
      const current = await storage.redis?.incrementRateLimit(key, Math.floor(windowMs / 1000));
      
      if (current && current > maxRequests) {
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: Math.floor(windowMs / 1000)
        });
      }

      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - (current || 0)));
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // 如果速率限制失败，继续处理请求
      next();
    }
  };
};

module.exports = {
  requireAuth,
  requireRoomMember,
  requireRoomOwner,
  requireFileAccess,
  optionalAuth,
  generateToken,
  createRateLimit
};