/**
 * Redis Client for Upstash
 * 用于替代内存Map存储，实现数据持久化
 */

const redis = require('redis');

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}


class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      const redisUrl = process.env.REDIS_URL;
      const useTls = redisUrl?.startsWith('rediss://');
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          tls: useTls,
          rejectUnauthorized: false, // Upstash requires this
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis reconnect failed after 10 attempts');
              return new Error('Redis reconnect failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('⚠️  Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Room operations
  async setRoom(roomId, roomData, ttl = 86400) {
    // TTL: 24 hours
    await this.client.setEx(
      `room:${roomId}`,
      ttl,
      JSON.stringify(roomData)
    );
  }

  async getRoom(roomId) {
    const data = await this.client.get(`room:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteRoom(roomId) {
    await this.client.del(`room:${roomId}`);
  }

  async getAllRooms() {
    const keys = await this.client.keys('room:*');
    const rooms = [];
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) rooms.push(JSON.parse(data));
    }
    return rooms;
  }

  // User operations
  async setUser(userId, userData, ttl = 3600) {
    // TTL: 1 hour
    await this.client.setEx(
      `user:${userId}`,
      ttl,
      JSON.stringify(userData)
    );

    if (userData && userData.username) {
      const normalized = normalizeUsername(userData.username);
      await this.client.setEx(`user:username:${normalized}`, ttl, String(userId));
    }
  }

  async getUser(userId) {
    const data = await this.client.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUser(userId) {
    const existing = await this.getUser(userId);
    if (existing && existing.username) {
      const normalized = normalizeUsername(existing.username);
      await this.client.del(`user:username:${normalized}`);
    }
    await this.client.del(`user:${userId}`);
  }

  async getUserByUsername(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) return null;

    const userId = await this.client.get(`user:username:${normalized}`);
    if (!userId) return null;
    return await this.getUser(userId);
  }

  // Online users (Set)
  async addOnlineUser(userId) {
    await this.client.sAdd('online:users', userId);
    await this.client.expire('online:users', 300); // 5 minutes
  }

  async removeOnlineUser(userId) {
    await this.client.sRem('online:users', userId);
  }

  async getOnlineUsers() {
    return await this.client.sMembers('online:users');
  }

  async isUserOnline(userId) {
    return await this.client.sIsMember('online:users', userId);
  }

  // Chat messages (List)
  async addChatMessage(roomId, message, maxMessages = 1000) {
    const key = `chat:${roomId}`;
    await this.client.rPush(key, JSON.stringify(message));
    await this.client.lTrim(key, -maxMessages, -1); // Keep last 1000 messages
    await this.client.expire(key, 604800); // 7 days
  }

  async getChatMessages(roomId, start = 0, end = -1) {
    const messages = await this.client.lRange(`chat:${roomId}`, start, end);
    return messages.map(msg => JSON.parse(msg));
  }

  async clearChatMessages(roomId) {
    await this.client.del(`chat:${roomId}`);
  }

  // Task cache
  async setTask(taskId, taskData, ttl = 3600) {
    // TTL: 1 hour
    await this.client.setEx(
      `task:${taskId}`,
      ttl,
      JSON.stringify(taskData)
    );
  }

  async getTask(taskId) {
    const data = await this.client.get(`task:${taskId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteTask(taskId) {
    await this.client.del(`task:${taskId}`);
  }

  // Rate limiting
  async incrementRateLimit(key, ttl = 60) {
    const current = await this.client.incr(`ratelimit:${key}`);
    if (current === 1) {
      await this.client.expire(`ratelimit:${key}`, ttl);
    }
    return current;
  }

  async getRateLimit(key) {
    const count = await this.client.get(`ratelimit:${key}`);
    return count ? parseInt(count) : 0;
  }

  // Generic operations
  async set(key, value, ttl = null) {
    if (ttl) {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } else {
      await this.client.set(key, JSON.stringify(value));
    }
  }

  async get(key) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key) {
    await this.client.del(key);
  }

  async exists(key) {
    return await this.client.exists(key);
  }

  async keys(pattern) {
    return await this.client.keys(pattern);
  }

  // Health check
  async ping() {
    return await this.client.ping();
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new RedisClient();
    }
    return instance;
  },
  RedisClient
};
