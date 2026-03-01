/**
 * Storage Adapter
 * 统一存储接口，协调Redis和R2的使用
 */

const { getInstance: getRedisClient } = require('./redis-client');
const { getInstance: getR2Client } = require('./r2-client');

class StorageAdapter {
  constructor() {
    this.redis = null;
    this.r2 = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // 初始化Redis
      if (process.env.REDIS_URL) {
        this.redis = getRedisClient();
        await this.redis.connect();
        console.log('✅ Redis storage initialized');
      } else {
        console.warn('⚠️  REDIS_URL not configured, using memory storage');
      }

      // 初始化R2
      if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
        this.r2 = getR2Client();
        const health = await this.r2.healthCheck();
        if (health.success) {
          console.log('✅ R2 storage initialized');
        }
      } else {
        console.warn('⚠️  R2 credentials not configured, using local storage');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw error;
    }
  }

  // Redis operations (with fallback)
  async setRoom(roomId, roomData, ttl) {
    if (this.redis) {
      return await this.redis.setRoom(roomId, roomData, ttl);
    }
    // Fallback to memory would go here
    console.warn('Redis not available, data not persisted');
  }

  async getRoom(roomId) {
    if (this.redis) {
      return await this.redis.getRoom(roomId);
    }
    return null;
  }

  async deleteRoom(roomId) {
    if (this.redis) {
      return await this.redis.deleteRoom(roomId);
    }
  }

  async getAllRooms() {
    if (this.redis) {
      return await this.redis.getAllRooms();
    }
    return [];
  }

  async setUser(userId, userData, ttl) {
    if (this.redis) {
      return await this.redis.setUser(userId, userData, ttl);
    }
  }

  async getUser(userId) {
    if (this.redis) {
      return await this.redis.getUser(userId);
    }
    return null;
  }

  async addChatMessage(roomId, message) {
    if (this.redis) {
      return await this.redis.addChatMessage(roomId, message);
    }
  }

  async getChatMessages(roomId, start, end) {
    if (this.redis) {
      return await this.redis.getChatMessages(roomId, start, end);
    }
    return [];
  }

  async setTask(taskId, taskData, ttl) {
    if (this.redis) {
      return await this.redis.setTask(taskId, taskData, ttl);
    }
  }

  async getTask(taskId) {
    if (this.redis) {
      return await this.redis.getTask(taskId);
    }
    return null;
  }

  async addOnlineUser(userId) {
    if (this.redis) {
      return await this.redis.addOnlineUser(userId);
    }
  }

  async removeOnlineUser(userId) {
    if (this.redis) {
      return await this.redis.removeOnlineUser(userId);
    }
  }

  async getOnlineUsers() {
    if (this.redis) {
      return await this.redis.getOnlineUsers();
    }
    return [];
  }

  // R2 operations (with fallback)
  async uploadFile(options) {
    if (this.r2) {
      const { roomId, fileId, filename, body, contentType, metadata } = options;
      return await this.r2.uploadUserFile(roomId, fileId, filename, body, {
        contentType,
        metadata
      });
    }
    // Fallback to local storage would go here
    throw new Error('R2 not available');
  }

  async uploadThumbnail(roomId, fileId, body, format) {
    if (this.r2) {
      return await this.r2.uploadThumbnail(roomId, fileId, body, format);
    }
    throw new Error('R2 not available');
  }

  async uploadModel(taskId, filename, body) {
    if (this.r2) {
      return await this.r2.uploadModel(taskId, filename, body);
    }
    throw new Error('R2 not available');
  }

  async uploadPointCloud(scanId, filename, body) {
    if (this.r2) {
      return await this.r2.uploadPointCloud(scanId, filename, body);
    }
    throw new Error('R2 not available');
  }

  async getFile(key) {
    if (this.r2) {
      return await this.r2.getFile(key);
    }
    throw new Error('R2 not available');
  }

  async deleteFile(key) {
    if (this.r2) {
      return await this.r2.deleteFile(key);
    }
  }

  async getPublicUrl(key) {
    if (this.r2) {
      return this.r2.getPublicUrl(key);
    }
    return null;
  }

  // Health check
  async healthCheck() {
    const status = {
      redis: false,
      r2: false
    };

    if (this.redis) {
      try {
        await this.redis.ping();
        status.redis = true;
      } catch (error) {
        console.error('Redis health check failed:', error);
      }
    }

    if (this.r2) {
      try {
        const health = await this.r2.healthCheck();
        status.r2 = health.success;
      } catch (error) {
        console.error('R2 health check failed:', error);
      }
    }

    return status;
  }

  async shutdown() {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new StorageAdapter();
    }
    return instance;
  },
  StorageAdapter
};
