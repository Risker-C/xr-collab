class RoomManager {
  constructor(redis) {
    this.rooms = new Map();
    this.redis = redis;
  }

  async createRoom(roomId, options = {}) {
    const room = {
      id: roomId,
      users: new Set(),
      objects: [],
      created: Date.now(),
      maxUsers: options.maxUsers || 50,
      persistent: options.persistent || false
    };
    this.rooms.set(roomId, room);
    
    if (this.redis && room.persistent) {
      await this.redis.set(`room:${roomId}`, JSON.stringify({
        ...room,
        users: Array.from(room.users)
      }));
    }
    return room;
  }

  async getRoom(roomId) {
    if (this.rooms.has(roomId)) return this.rooms.get(roomId);
    
    if (this.redis) {
      const data = await this.redis.get(`room:${roomId}`);
      if (data) {
        const room = JSON.parse(data);
        room.users = new Set(room.users);
        this.rooms.set(roomId, room);
        return room;
      }
    }
    return null;
  }

  async joinRoom(roomId, userId, userData) {
    let room = await this.getRoom(roomId);
    if (!room) room = await this.createRoom(roomId);
    
    if (room.users.size >= room.maxUsers) throw new Error('Room full');
    
    room.users.add(userId);
    if (this.redis && room.persistent) {
      await this.redis.sadd(`room:${roomId}:users`, userId);
    }
    return room;
  }

  async leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.users.delete(userId);
    if (this.redis) {
      await this.redis.srem(`room:${roomId}:users`, userId);
    }
    
    if (room.users.size === 0 && !room.persistent) {
      this.rooms.delete(roomId);
      if (this.redis) await this.redis.del(`room:${roomId}`);
    }
  }

  async addObject(roomId, object) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.objects.push(object);
    if (this.redis && room.persistent) {
      await this.redis.rpush(`room:${roomId}:objects`, JSON.stringify(object));
    }
  }

  getRoomList() {
    return Array.from(this.rooms.entries()).map(([id, room]) => ({
      id,
      users: room.users.size,
      maxUsers: room.maxUsers,
      created: room.created
    }));
  }
}

module.exports = RoomManager;
