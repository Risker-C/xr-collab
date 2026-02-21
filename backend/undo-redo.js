const COMMAND_TYPES = {
  CREATE_OBJECT: "CREATE_OBJECT",
  DELETE_OBJECT: "DELETE_OBJECT",
  UPDATE_OBJECT: "UPDATE_OBJECT",
  CLEAR_OBJECTS: "CLEAR_OBJECTS"
};

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

class BaseCommand {
  constructor(payload = {}) {
    this.id =
      payload.id ||
      `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.type = payload.type;
    this.roomId = payload.roomId;
    this.userId = payload.userId;
    this.objectId = payload.objectId || null;
    this.timestamp = payload.timestamp || Date.now();
    this.before = deepClone(payload.before);
    this.after = deepClone(payload.after);
    this.meta = deepClone(payload.meta || {});
  }

  getLabel() {
    switch (this.type) {
      case COMMAND_TYPES.CREATE_OBJECT:
        return "创建物体";
      case COMMAND_TYPES.DELETE_OBJECT:
        return "删除物体";
      case COMMAND_TYPES.UPDATE_OBJECT:
        return "修改物体";
      case COMMAND_TYPES.CLEAR_OBJECTS:
        return "清空场景";
      default:
        return this.type;
    }
  }

  toHistoryEntry(status = "done") {
    return {
      id: this.id,
      type: this.type,
      label: this.getLabel(),
      userId: this.userId,
      objectId: this.objectId,
      timestamp: this.timestamp,
      status,
      meta: deepClone(this.meta || {})
    };
  }

  canMergeWith() {
    return false;
  }

  merge() {
    return false;
  }

  async execute() {
    throw new Error("execute() must be implemented");
  }

  async undo() {
    throw new Error("undo() must be implemented");
  }
}

class CreateObjectCommand extends BaseCommand {
  async execute(context) {
    if (!this.after) return;
    await context.upsertObject(this.after, this.userId);
  }

  async undo(context) {
    if (!this.objectId) return;
    await context.removeObject(this.objectId);
  }
}

class DeleteObjectCommand extends BaseCommand {
  async execute(context) {
    if (!this.objectId) return;
    await context.removeObject(this.objectId);
  }

  async undo(context) {
    if (!this.before) return;
    await context.upsertObject(this.before, this.userId);
  }
}

class UpdateObjectCommand extends BaseCommand {
  async execute(context) {
    if (!this.objectId || !this.after) return;
    await context.updateObject(this.objectId, this.after, this.userId);
  }

  async undo(context) {
    if (!this.objectId || !this.before) return;
    await context.updateObject(this.objectId, this.before, this.userId);
  }

  canMergeWith(nextCommand, mergeWindowMs = 500) {
    if (!(nextCommand instanceof UpdateObjectCommand)) return false;
    if (!this.objectId || this.objectId !== nextCommand.objectId) return false;

    const thisMergeKey = this.meta?.mergeKey;
    const nextMergeKey = nextCommand.meta?.mergeKey;
    if (!thisMergeKey || !nextMergeKey || thisMergeKey !== nextMergeKey) {
      return false;
    }

    return nextCommand.timestamp - this.timestamp <= mergeWindowMs;
  }

  merge(nextCommand) {
    this.after = deepClone(nextCommand.after);
    this.timestamp = nextCommand.timestamp;
    this.meta = {
      ...deepClone(this.meta || {}),
      ...deepClone(nextCommand.meta || {}),
      merged: (this.meta?.merged || 1) + 1
    };
    return true;
  }
}

class ClearObjectsCommand extends BaseCommand {
  async execute(context) {
    await context.clearObjects();
  }

  async undo(context) {
    const objects = Array.isArray(this.before) ? this.before : [];
    await context.restoreObjects(objects, this.userId);
  }
}

function createCommand(payload = {}) {
  switch (payload.type) {
    case COMMAND_TYPES.CREATE_OBJECT:
      return new CreateObjectCommand(payload);
    case COMMAND_TYPES.DELETE_OBJECT:
      return new DeleteObjectCommand(payload);
    case COMMAND_TYPES.UPDATE_OBJECT:
      return new UpdateObjectCommand(payload);
    case COMMAND_TYPES.CLEAR_OBJECTS:
      return new ClearObjectsCommand(payload);
    default:
      throw new Error(`Unsupported command type: ${payload.type}`);
  }
}

class OperationLogManager {
  constructor(options = {}) {
    this.maxSteps = Number(options.maxSteps) || 100;
    this.maxTimeline = Number(options.maxTimeline) || 300;
    this.mergeWindowMs = Number(options.mergeWindowMs) || 500;

    // roomId -> Map(userId -> { undo: Command[], redo: Command[] })
    this.stacksByRoom = new Map();
    // roomId -> HistoryEntry[]
    this.timelineByRoom = new Map();
  }

  ensureUserStack(roomId, userId) {
    if (!this.stacksByRoom.has(roomId)) {
      this.stacksByRoom.set(roomId, new Map());
    }

    const roomStacks = this.stacksByRoom.get(roomId);
    if (!roomStacks.has(userId)) {
      roomStacks.set(userId, { undo: [], redo: [] });
    }

    return roomStacks.get(userId);
  }

  appendTimeline(roomId, command, mode = "execute", conflict = null) {
    const timeline = this.timelineByRoom.get(roomId) || [];

    const status = mode === "undo" ? "undone" : "done";
    timeline.push({
      ...command.toHistoryEntry(status),
      mode,
      conflict: conflict
        ? {
            objectId: conflict.objectId,
            lastModifiedBy: conflict.lastModifiedBy,
            updatedAt: conflict.updatedAt,
            strategy: conflict.strategy
          }
        : null
    });

    if (timeline.length > this.maxTimeline) {
      timeline.splice(0, timeline.length - this.maxTimeline);
    }

    this.timelineByRoom.set(roomId, timeline);
  }

  record(roomId, userId, command) {
    const stack = this.ensureUserStack(roomId, userId);
    const undoStack = stack.undo;
    const lastCommand = undoStack[undoStack.length - 1];

    if (
      lastCommand &&
      typeof lastCommand.canMergeWith === "function" &&
      lastCommand.canMergeWith(command, this.mergeWindowMs)
    ) {
      lastCommand.merge(command);
    } else {
      undoStack.push(command);
      if (undoStack.length > this.maxSteps) {
        undoStack.shift();
      }
    }

    stack.redo = [];
    this.appendTimeline(roomId, command, "execute");

    return this.getHistory(roomId, userId);
  }

  async detectConflict(command, userId, context) {
    if (!command?.objectId || !context?.getObject) return null;

    const currentObject = await context.getObject(command.objectId);
    if (!currentObject) return null;

    const lastModifiedBy = currentObject._lastModifiedBy;
    const updatedAt = Number(currentObject._updatedAt || 0);

    if (
      lastModifiedBy &&
      lastModifiedBy !== userId &&
      updatedAt > Number(command.timestamp || 0)
    ) {
      return {
        objectId: command.objectId,
        lastModifiedBy,
        updatedAt,
        strategy: "last-write-wins",
        message: "检测到其他用户修改，已按最后写入胜出策略执行撤销/重做"
      };
    }

    return null;
  }

  async undo(roomId, userId, context) {
    const stack = this.ensureUserStack(roomId, userId);
    if (!stack.undo.length) {
      return { ok: false, reason: "EMPTY_UNDO" };
    }

    const command = stack.undo.pop();
    const conflict = await this.detectConflict(command, userId, context);

    await command.undo(context);

    stack.redo.push(command);
    if (stack.redo.length > this.maxSteps) {
      stack.redo.shift();
    }

    this.appendTimeline(roomId, command, "undo", conflict);

    return {
      ok: true,
      command,
      conflict,
      history: this.getHistory(roomId, userId)
    };
  }

  async redo(roomId, userId, context) {
    const stack = this.ensureUserStack(roomId, userId);
    if (!stack.redo.length) {
      return { ok: false, reason: "EMPTY_REDO" };
    }

    const command = stack.redo.pop();
    const conflict = await this.detectConflict(command, userId, context);

    await command.execute(context);

    stack.undo.push(command);
    if (stack.undo.length > this.maxSteps) {
      stack.undo.shift();
    }

    this.appendTimeline(roomId, command, "redo", conflict);

    return {
      ok: true,
      command,
      conflict,
      history: this.getHistory(roomId, userId)
    };
  }

  getHistory(roomId, userId) {
    const stack = this.ensureUserStack(roomId, userId);

    const undoStack = [...stack.undo]
      .reverse()
      .map((command) => command.toHistoryEntry("done"));
    const redoStack = [...stack.redo]
      .reverse()
      .map((command) => command.toHistoryEntry("undone"));

    return {
      maxSteps: this.maxSteps,
      undoCount: stack.undo.length,
      redoCount: stack.redo.length,
      undoStack,
      redoStack
    };
  }

  getRoomTimeline(roomId, limit = 80) {
    const timeline = this.timelineByRoom.get(roomId) || [];
    if (limit <= 0) return [];
    return timeline.slice(-limit).reverse();
  }

  clearRoom(roomId) {
    this.stacksByRoom.delete(roomId);
    this.timelineByRoom.delete(roomId);
  }
}

module.exports = {
  COMMAND_TYPES,
  createCommand,
  OperationLogManager,
  deepClone
};
