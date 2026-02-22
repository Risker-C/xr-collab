const redisClient = require('../config/redis');

class CacheService {
  /**
   * Get cached device profile
   */
  static async getDeviceProfile(fingerprint) {
    try {
      const cacheKey = `device:${fingerprint}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Cache device profile
   */
  static async setDeviceProfile(fingerprint, profileData) {
    try {
      const cacheKey = `device:${fingerprint}`;
      const ttl = parseInt(process.env.DEVICE_CACHE_TTL) || 86400; // 24 hours default
      
      await redisClient.setEx(
        cacheKey,
        ttl,
        JSON.stringify(profileData)
      );
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false; // Fail gracefully
    }
  }

  /**
   * Invalidate device profile cache
   */
  static async invalidateDeviceProfile(fingerprint) {
    try {
      const cacheKey = `device:${fingerprint}`;
      await redisClient.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Get cached tier statistics
   */
  static async getTierStats() {
    try {
      const cacheKey = 'stats:tiers';
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Cache tier statistics
   */
  static async setTierStats(stats) {
    try {
      const cacheKey = 'stats:tiers';
      const ttl = 300; // 5 minutes
      
      await redisClient.setEx(
        cacheKey,
        ttl,
        JSON.stringify(stats)
      );
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }
}

module.exports = CacheService;
