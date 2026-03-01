const bcrypt = require("bcrypt");

const ROOM_PASSWORD_MIN_LENGTH = 8;
const { getInstance: getStorageAdapter } = require("./storage/storage-adapter");

const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 6;

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function getObjectId(object) {
  return String(object?.id ?? object?.objectId ?? "");
}

class RoomManager {
  constructor(redis) {
    this.rooms = new Map(); // 内存缓存
    this.storage = getStorageAdapter(); // 使用新的storage adapter
    this.redis = redis; // 保留向后兼容性
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

  validatePasswordStrength(password) {
    if (!password) return;
    const value = String(password);
    if (value.length < ROOM_PASSWORD_MIN_LENGTH) {
      throw new Error(`Room password must be at least ${ROOM_PASSWORD_MIN_LENGTH} characters`);
    }
    const hasLetter = /[A-Za-z]/.test(value);
    const hasNumber = /\d/.test(value);
    if (!hasLetter || !hasNumber) {
      throw new Error('Room password must include letters and numbers');
    }
  }

  async hashPassword(password) {
    if (!password) return null;
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(String(password), salt);
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
      whiteboards: Array.isArray(rawRoom.whiteboards)
        ? rawRoom.whiteboards.map((wb) => ({
            ...wb,
            history: Array.isArray(wb?.history) ? wb.history : [],
            redoStack: Array.isArray(wb?.redoStack) ? wb.redoStack : []
          }))
        : [],
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
    if (!room.persistent) return;
    
    // 使用新的storage adapter
    try {
      await this.storage.setRoom(room.id, this.serializeRoom(room));
    } catch (error) {
      console.error('Failed to persist room:', error);
      // 降级到旧的redis（如果存在）
      if (this.redis) {
        await this.redis.set(`room:${room.id}`, JSON.stringify(this.serializeRoom(room)));
      }
    }
  }

  normalizeObjectPayload(object = {}, actorId = null) {
    const now = Date.now();
    const normalized = deepClone(object) || {};

    const objectId = getObjectId(normalized) || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    normalized.id = objectId;
    normalized.objectId = objectId;

    normalized.position = normalized.position || { x: 0, y: 1, z: 0 };
    normalized.rotation = normalized.rotation || { x: 0, y: 0, z: 0 };
    normalized.scale = normalized.scale || { x: 1, y: 1, z: 1 };

    if (normalized.color === undefined || normalized.color === null) {
      normalized.color = 0xff0000;
    }

    if (!normalized.material || typeof normalized.material !== "object") {
      normalized.material = { type: "MeshStandardMaterial" };
    }

    if (!normalized.createdAt) normalized.createdAt = now;
    normalized._version = Number(normalized._version || 0);
    normalized._updatedAt = Number(normalized._updatedAt || now);
    normalized._lastModifiedBy = normalized._lastModifiedBy || null;

    if (actorId) {
      normalized._version += 1;
      normalized._updatedAt = now;
      normalized._lastModifiedBy = actorId;
      normalized.createdBy = normalized.createdBy || actorId;
    }

    return normalized;
  }

  async createRoom(options = {}) {
    const normalizedRoomId = this.normalizeRoomId(options.roomId);
    const roomId = normalizedRoomId || this.generateRoomId();

    if (this.rooms.has(roomId)) {
      throw new Error("Room already exists");
    }

    this.validatePasswordStrength(options.password);

    const room = {
      id: roomId,
      name: String(options.name || `Room ${roomId}`),
      isPublic: options.isPublic !== false,
      passwordHash: await this.hashPassword(options.password),
      users: new Map(),
      objects: [],
      whiteboards: [],
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

    // 先从内存缓存获取
    if (this.rooms.has(normalizedRoomId)) {
      return this.rooms.get(normalizedRoomId);
    }

    // 从storage adapter获取
    try {
      const data = await this.storage.getRoom(normalizedRoomId);
      if (data) {
        const room = this.hydrateRoom(data);
        this.rooms.set(normalizedRoomId, room);
        return room;
      }
    } catch (error) {
      console.error('Failed to get room from storage:', error);
    }

    // 降级到旧的redis（如果存在）
    if (this.redis) {
      const data = await this.redis.get(`room:${normalizedRoomId}`);
      if (data) {
        const parsed = JSON.parse(data);
        const room = this.hydrateRoom(parsed);
        this.rooms.set(normalizedRoomId, room);
        return room;
      }
    }

    return null;
  }

  async joinRoom(roomId, userId, userData = {}, password = "") {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error("Room not found");

    if (room.passwordHash) {
      const valid = await bcrypt.compare(String(password || ''), room.passwordHash);
      if (!valid) {
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

    if (!room.ownerId) {
      room.ownerId = userId;
    }

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

    if (room.ownerId === userId) {
      const nextHost = room.users.values().next().value;
      room.ownerId = nextHost ? nextHost.userId : null;
    }

    if (room.users.size === 0 && !room.persistent) {
      this.rooms.delete(room.id);
      try {
        await this.storage.deleteRoom(room.id);
      } catch (error) {
        console.error('Failed to delete room from storage:', error);
        if (this.redis) {
          await this.redis.del(`room:${room.id}`);
        }
      }
      return;
    }

    await this.persistRoom(room);
  }

  async deleteRoom(roomId) {
    const normalizedRoomId = this.normalizeRoomId(roomId);
    if (!normalizedRoomId) return null;

    const room = await this.getRoom(normalizedRoomId);
    if (!room) return null;

    this.rooms.delete(normalizedRoomId);

    try {
      await this.storage.deleteRoom(normalizedRoomId);
    } catch (error) {
      console.error('Failed to delete room from storage:', error);
      if (this.redis) {
        await this.redis.del(`room:${normalizedRoomId}`);
      }
    }

    return room;
  }


  async getObject(roomId, objectId) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedObjectId = String(objectId || "");
    const object = room.objects.find(
      (candidate) => String(candidate?.id ?? candidate?.objectId) === normalizedObjectId
    );

    return object ? deepClone(object) : null;
  }

  async upsertObject(roomId, object, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalized = this.normalizeObjectPayload(object, actorId);
    const objectId = normalized.id;

    const objectIndex = room.objects.findIndex(
      (candidate) => String(candidate?.id ?? candidate?.objectId) === String(objectId)
    );

    if (objectIndex >= 0) {
      room.objects[objectIndex] = normalized;
    } else {
      room.objects.push(normalized);
    }

    await this.persistRoom(room);
    return deepClone(normalized);
  }

  async addObject(roomId, object, actorId = null) {
    return this.upsertObject(roomId, object, actorId);
  }

  async removeObject(roomId, objectId) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedObjectId = String(objectId || "");
    const objectIndex = room.objects.findIndex(
      (candidate) => String(candidate?.id ?? candidate?.objectId) === normalizedObjectId
    );

    if (objectIndex < 0) {
      return null;
    }

    const [removedObject] = room.objects.splice(objectIndex, 1);
    await this.persistRoom(room);
    return deepClone(removedObject);
  }

  async clearObjects(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return [];

    const removedObjects = deepClone(room.objects || []);
    room.objects = [];
    await this.persistRoom(room);

    return removedObjects;
  }

  async updateObject(roomId, objectId, updates = {}, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedObjectId = String(objectId || "");
    const objectIndex = room.objects.findIndex(
      (candidate) => String(candidate?.id ?? candidate?.objectId) === normalizedObjectId
    );

    if (objectIndex < 0) {
      return null;
    }

    const currentObject = room.objects[objectIndex];
    const mergedObject = {
      ...deepClone(currentObject),
      ...deepClone(updates),
      id: currentObject.id || currentObject.objectId,
      objectId: currentObject.id || currentObject.objectId
    };

    const normalized = this.normalizeObjectPayload(mergedObject, actorId);
    room.objects[objectIndex] = normalized;

    await this.persistRoom(room);
    return deepClone(normalized);
  }

  async moveObject(roomId, objectId, position, actorId = null) {
    return this.updateObject(roomId, objectId, { position }, actorId);
  }

  async getRoomUsers(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  async getRoomObjects(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return [];
    return deepClone(room.objects);
  }

  async getRoomWhiteboards(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return [];
    return deepClone(room.whiteboards || []);
  }

  async upsertWhiteboard(roomId, whiteboard = {}, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const now = Date.now();
    const whiteboardId = String(
      whiteboard.id || whiteboard.whiteboardId || `wb_${now}_${Math.random().toString(36).slice(2, 7)}`
    );

    const existingWhiteboard = (room.whiteboards || []).find(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === whiteboardId
    );

    const normalized = {
      ...deepClone(existingWhiteboard || {}),
      ...deepClone(whiteboard),
      id: whiteboardId,
      whiteboardId,
      history: Array.isArray(whiteboard.history)
        ? deepClone(whiteboard.history)
        : Array.isArray(existingWhiteboard?.history)
          ? deepClone(existingWhiteboard.history)
          : [],
      redoStack: Array.isArray(whiteboard.redoStack)
        ? deepClone(whiteboard.redoStack)
        : Array.isArray(existingWhiteboard?.redoStack)
          ? deepClone(existingWhiteboard.redoStack)
          : [],
      position: whiteboard.position || existingWhiteboard?.position || { x: 0, y: 2, z: -5 },
      rotation: whiteboard.rotation || existingWhiteboard?.rotation || { x: 0, y: 0, z: 0 },
      scale: whiteboard.scale || existingWhiteboard?.scale || { x: 1, y: 1, z: 1 },
      width: whiteboard.width || existingWhiteboard?.width || 1024,
      height: whiteboard.height || existingWhiteboard?.height || 1024,
      worldWidth: whiteboard.worldWidth || existingWhiteboard?.worldWidth || 4,
      worldHeight: whiteboard.worldHeight || existingWhiteboard?.worldHeight || 4,
      createdAt: whiteboard.createdAt || existingWhiteboard?.createdAt || now,
      updatedAt: now,
      updatedBy: actorId || whiteboard.updatedBy || null
    };

    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === whiteboardId
    );

    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }

    room.whiteboards = list;
    await this.persistRoom(room);
    return deepClone(normalized);
  }

  async getWhiteboard(roomId, whiteboardId) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const whiteboard = (room.whiteboards || []).find(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    return whiteboard ? deepClone(whiteboard) : null;
  }

  async appendWhiteboardAction(roomId, whiteboardId, action, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    if (index < 0) return null;

    const whiteboard = list[index];
    const history = Array.isArray(whiteboard.history) ? deepClone(whiteboard.history) : [];
    history.push(deepClone(action));

    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }

    whiteboard.history = history;
    whiteboard.redoStack = [];
    whiteboard.updatedAt = Date.now();
    whiteboard.updatedBy = actorId || null;
    list[index] = whiteboard;
    room.whiteboards = list;

    await this.persistRoom(room);
    return deepClone(whiteboard);
  }

  async setWhiteboardHistory(roomId, whiteboardId, history = [], actorId = null, redoStack = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    if (index < 0) return null;

    list[index].history = Array.isArray(history) ? deepClone(history) : [];
    if (Array.isArray(redoStack)) {
      list[index].redoStack = deepClone(redoStack);
    }
    list[index].updatedAt = Date.now();
    list[index].updatedBy = actorId || null;

    room.whiteboards = list;
    await this.persistRoom(room);

    return deepClone(list[index]);
  }

  async undoWhiteboardAction(roomId, whiteboardId, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    if (index < 0) return null;

    const whiteboard = list[index];
    const history = Array.isArray(whiteboard.history) ? deepClone(whiteboard.history) : [];
    const redoStack = Array.isArray(whiteboard.redoStack) ? deepClone(whiteboard.redoStack) : [];

    if (!history.length) return deepClone(whiteboard);

    const popped = history.pop();
    redoStack.push(popped);

    whiteboard.history = history;
    whiteboard.redoStack = redoStack;
    whiteboard.updatedAt = Date.now();
    whiteboard.updatedBy = actorId || null;

    list[index] = whiteboard;
    room.whiteboards = list;
    await this.persistRoom(room);

    return deepClone(whiteboard);
  }

  async redoWhiteboardAction(roomId, whiteboardId, actorId = null) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    if (index < 0) return null;

    const whiteboard = list[index];
    const history = Array.isArray(whiteboard.history) ? deepClone(whiteboard.history) : [];
    const redoStack = Array.isArray(whiteboard.redoStack) ? deepClone(whiteboard.redoStack) : [];

    if (!redoStack.length) return deepClone(whiteboard);

    const restored = redoStack.pop();
    history.push(restored);

    whiteboard.history = history;
    whiteboard.redoStack = redoStack;
    whiteboard.updatedAt = Date.now();
    whiteboard.updatedBy = actorId || null;

    list[index] = whiteboard;
    room.whiteboards = list;
    await this.persistRoom(room);

    return deepClone(whiteboard);
  }

  async removeWhiteboard(roomId, whiteboardId) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const normalizedId = String(whiteboardId || "");
    const list = Array.isArray(room.whiteboards) ? room.whiteboards : [];
    const index = list.findIndex(
      (candidate) => String(candidate?.id || candidate?.whiteboardId) === normalizedId
    );

    if (index < 0) return null;

    const [removed] = list.splice(index, 1);
    room.whiteboards = list;
    await this.persistRoom(room);

    return deepClone(removed);
  }

  async getRoomList(includePrivate = false) {
    const roomsById = new Map();

    this.rooms.forEach((room, roomId) => {
      roomsById.set(roomId, room);
    });

    try {
      const storedRooms = await this.storage.getAllRooms();
      if (Array.isArray(storedRooms)) {
        storedRooms.forEach((raw) => {
          const hydrated = this.hydrateRoom(raw);
          if (hydrated && !roomsById.has(hydrated.id)) {
            roomsById.set(hydrated.id, hydrated);
            this.rooms.set(hydrated.id, hydrated);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load rooms from storage:', error);
    }

    return Array.from(roomsById.values())
      .filter((room) => includePrivate || room.isPublic)
      .sort((a, b) => b.created - a.created)
      .map((room) => this.getRoomSummary(room));
  }
}

module.exports = RoomManager;
