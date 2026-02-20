const Redis = require('ioredis');

class RedisStore {
  constructor() {
    this.client = null;
    this.enabled = false;
  }

  async connect() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('⚠️  REDIS_URL not set, persistence disabled');
      return;
    }

    try {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
      await this.client.ping();
      this.enabled = true;
      console.log('✅ Redis connected');
    } catch (e) {
      console.error('❌ Redis connection failed:', e.message);
      this.enabled = false;
    }
  }

  async recordEvent(roomId, event) {
    if (!this.enabled) return;
    
    const record = { ...event, timestamp: Date.now() };
    await this.client.rpush(`replay:${roomId}`, JSON.stringify(record));
    await this.client.expire(`replay:${roomId}`, 86400); // 24h TTL
  }

  async getReplay(roomId, fromTime = 0) {
    if (!this.enabled) return [];
    
    const events = await this.client.lrange(`replay:${roomId}`, 0, -1);
    return events
      .map(e => JSON.parse(e))
      .filter(e => e.timestamp >= fromTime);
  }

  async set(key, value, ttl) {
    if (!this.enabled) return;
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key) {
    if (!this.enabled) return null;
    return await this.client.get(key);
  }

  async sadd(key, value) {
    if (!this.enabled) return;
    await this.client.sadd(key, value);
  }

  async srem(key, value) {
    if (!this.enabled) return;
    await this.client.srem(key, value);
  }

  async rpush(key, value) {
    if (!this.enabled) return;
    await this.client.rpush(key, value);
  }

  async del(key) {
    if (!this.enabled) return;
    await this.client.del(key);
  }
}

module.exports = RedisStore;
