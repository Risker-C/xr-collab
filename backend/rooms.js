const crypto = require("crypto");

const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 6;

class RoomManager {
  constructor(redis) {
    this.rooms = new Map();
    this.redis = redis;
  }

  normalizeRoomId(roomId) {
    return String(roomId || "")
      .trim()
      .toUpperCase();
  }

  generateRoomId() {
    let roomId = "";
    do {
      roomId = Array.from({ length: ROOM_ID_LENGTH }, () => {
        const index = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
        return ROOM_ID_ALPHABET[index];
      }).join("");
    } while (this.rooms.has(roomId));
    return roomId;
  }

  hashPassword(password) {
    if (!password) return null;
    return crypto.createHash("sha256").update(String(password)).digest("hex");
  }

  serializeRoom(room) {
    return {
      ...room,
      users: Array.from(room.users.values())
    };
  }

  hydrateRoom(rawRoom) {
    if (!rawRoom) return null;

    const users = new Map();
    if (Array.isArray(rawRoom.users)) {
      rawRoom.users.forEach((user) => {
        if (user && user.userId) {
          users.set(user.userId, user);
        }
      });
    }

    return {
      id: rawRoom.id,
      name: rawRoom.name,
      isPublic: rawRoom.isPublic !== false,
      passwordHash: rawRoom.passwordHash || null,
      users,
      objects: Array.isArray(rawRoom.objects) ? rawRoom.objects : [],
      created: rawRoom.created || Date.now(),
      maxUsers: rawRoom.maxUsers || 50,
      persistent: rawRoom.persistent || false,
      ownerId: rawRoom.ownerId || null
    };
  }

  getRoomSummary(room) {
    return {
      id: room.id,
      name: room.name,
      isPublic: room.isPublic,
      hasPassword: Boolean(room.passwordHash),
      userCount: room.users.size,
      maxUsers: room.maxUsers,
      created: room.created,
      ownerId: room.ownerId
    };
  }

  async persistRoom(room) {
    if (!this.redis || !room.persistent) return;
    await this.redis.set(`room:${room.id}`, JSON.stringify(this.serializeRoom(room)));
  }

  async createRoom(options = {}) {
    const normalizedRoomId = this.normalizeRoomId(options.roomId);
    const roomId = normalizedRoomId || this.generateRoomId();

    if (this.rooms.has(roomId)) {
      throw new Error("Room already exists");
    }

    const room = {
      id: roomId,
      name: String(options.name || `Room ${roomId}`),
      isPublic: options.isPublic !== false,
      passwordHash: this.hashPassword(options.password),
      users: new Map(),
      objects: [],
      created: Date.now(),
      maxUsers: Number(options.maxUsers) || 50,
      persistent: Boolean(options.persistent),
      ownerId: options.ownerId || null
    };

    this.rooms.set(roomId, room);
    await this.persistRoom(room);
    return room;
  }

  async getRoom(roomId) {
    const normalizedRoomId = this.normalizeRoomId(roomId);
    if (!normalizedRoomId) return null;

    if (this.rooms.has(normalizedRoomId)) {
      return this.rooms.get(normalizedRoomId);
    }

    if (!this.redis) return null;

    const data = await this.redis.get(`room:${normalizedRoomId}`);
    if (!data) return null;

    const parsed = JSON.parse(data);
    const room = this.hydrateRoom(parsed);
    this.rooms.set(normalizedRoomId, room);
    return room;
  }

  async joinRoom(roomId, userId, userData = {}, password = "") {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error("Room not found");

    if (room.passwordHash) {
      const passwordHash = this.hashPassword(password);
      if (passwordHash !== room.passwordHash) {
        throw new Error("Invalid room password");
      }
    }

    const existingUser = room.users.get(userId);
    if (!existingUser && room.users.size >= room.maxUsers) {
      throw new Error("Room is full");
    }

    const joinedUser = {
      userId,
      username: userData.username || userId,
      socketId: userData.socketId,
      position: userData.position || { x: 0, y: 1.6, z: 0 },
      rotation: userData.rotation || { x: 0, y: 0, z: 0 },
      joinedAt: existingUser ? existingUser.joinedAt : Date.now()
    };

    room.users.set(userId, joinedUser);
    await this.persistRoom(room);
    return room;
  }

  async updateUser(roomId, userId, updates = {}) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const user = room.users.get(userId);
    if (!user) return null;

    const nextUser = { ...user, ...updates };
    room.users.set(userId, nextUser);
    await this.persistRoom(room);
    return nextUser;
  }

  async leaveRoom(roomId, userId) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.users.delete(userId);

    if (room.users.size === 0 && !room.persistent) {
      this.rooms.delete(room.id);
      if (this.redis) {
        await this.redis.del(`room:${room.id}`);
      }
      return;
    }

    await this.persistRoom(room);
  }

  async addObject(roomId, object) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.objects.push(object);
    await this.persistRoom(room);
  }

  async removeObject(roomId, objectId) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.objects = room.objects.filter(
      (object) => String(object?.id ?? object?.objectId) !== String(objectId)
    );

    await this.persistRoom(room);
  }

  async clearObjects(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.objects = [];
    await this.persistRoom(room);
  }

  async moveObject(roomId, objectId, position) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    const objectToMove = room.objects.find(
      (object) => String(object?.id ?? object?.objectId) === String(objectId)
    );

    if (objectToMove) {
      objectToMove.position = position;
      await this.persistRoom(room);
    }
  }

  getRoomUsers(roomId) {
    const normalizedRoomId = this.normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  getRoomObjects(roomId) {
    const normalizedRoomId = this.normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) return [];
    return room.objects;
  }

  getRoomList(includePrivate = false) {
    return Array.from(this.rooms.values())
      .filter((room) => includePrivate || room.isPublic)
      .sort((a, b) => b.created - a.created)
      .map((room) => this.getRoomSummary(room));
  }
}

module.exports = RoomManager;
