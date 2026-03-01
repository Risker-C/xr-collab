const { getInstance: getSupabaseClient } = require('../storage/supabase-client');
const { getInstance: getRedisClient } = require('../storage/redis-client');

class RecoveryService {
  constructor(redis = getRedisClient(), supabase = getSupabaseClient()) {
    this.redis = redis;
    this.supabase = supabase;
  }

  // 从Supabase恢复房间数据到Redis
  async recoverRooms() {
    const rooms = await this.supabase.getAllRooms();
    for (const room of rooms) {
      await this.redis.setRoom(room.room_id, room);
    }
  }

  // 从Supabase恢复聊天历史到Redis
  async recoverChatHistory(roomId) {
    const messages = await this.supabase.getChatHistory(roomId);
    for (const message of messages) {
      await this.redis.addChatMessage(roomId, {
        userId: message.user_id || null,
        text: message.message,
        timestamp: message.created_at ? new Date(message.created_at).getTime() : Date.now()
      });
    }
  }

  // 系统启动时的完整恢复
  async fullRecovery() {
    console.log('Starting data recovery...');
    await this.recoverRooms();
    console.log('Data recovery completed');
  }
}

module.exports = RecoveryService;
