#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { getInstance: getRedisClient } = require('../storage/redis-client');

const envCandidates = [
  path.join(__dirname, '..', '.env.credentials'),
  path.join(__dirname, '..', '.env')
];

envCandidates.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const normalizeRoomId = (roomId) => String(roomId || '').trim().toUpperCase();

const toDate = (value) => {
  if (!value && value !== 0) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const chunkArray = (items, size = 200) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function migrateUsers(redis) {
  if (!redis) return new Map();

  const keys = await redis.keys('user:*');
  const userIds = new Set();
  keys.forEach((key) => {
    if (!key.startsWith('user:username:')) {
      userIds.add(key.replace('user:', ''));
    }
  });

  const payloads = [];
  for (const userId of userIds) {
    const user = await redis.getUser(userId);
    if (!user || !user.id || !isUuid(user.id)) continue;
    const passwordHash = user.passwordHash || user.password_hash;
    if (!passwordHash) continue;

    payloads.push({
      id: user.id,
      username: user.username,
      email: user.email || null,
      password_hash: passwordHash,
      created_at: toDate(user.createdAt).toISOString(),
      updated_at: toDate(user.updatedAt || user.createdAt).toISOString()
    });
  }

  const userMap = new Map(payloads.map((user) => [user.id, user.id]));

  for (const chunk of chunkArray(payloads)) {
    const { error } = await supabase
      .from('users')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.warn('Failed to upsert users chunk:', error.message);
    }
  }

  console.log(`✅ Users migrated: ${payloads.length}`);
  return userMap;
}

async function migrateRooms(redis, userMap) {
  if (!redis) return new Map();

  const rooms = await redis.getAllRooms();
  const payloads = rooms
    .map((room) => {
      if (!room || !room.id) return null;
      return {
        room_id: String(room.id),
        name: room.name || `Room ${room.id}`,
        password_hash: room.passwordHash || null,
        is_public: room.isPublic !== false,
        max_users: room.maxUsers || 50,
        created_by: isUuid(room.ownerId) && userMap.has(room.ownerId) ? room.ownerId : null,
        created_at: toDate(room.created).toISOString(),
        settings: {
          persistent: Boolean(room.persistent),
          objectsCount: Array.isArray(room.objects) ? room.objects.length : 0,
          whiteboardsCount: Array.isArray(room.whiteboards) ? room.whiteboards.length : 0
        }
      };
    })
    .filter(Boolean);

  const roomIdMap = new Map();
  for (const chunk of chunkArray(payloads)) {
    const { data, error } = await supabase
      .from('rooms')
      .upsert(chunk, { onConflict: 'room_id' })
      .select();

    if (error) {
      console.warn('Failed to upsert rooms chunk:', error.message);
      continue;
    }

    (data || []).forEach((room) => {
      roomIdMap.set(normalizeRoomId(room.room_id), room.id);
    });
  }

  console.log(`✅ Rooms migrated: ${payloads.length}`);
  return roomIdMap;
}

async function migrateFiles(roomIdMap, userMap) {
  const metaPath = path.join(__dirname, '..', 'storage', 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    console.warn('No file metadata found, skipping file migration.');
    return;
  }

  const raw = await fsp.readFile(metaPath, 'utf8');
  if (!raw) return;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn('Invalid metadata.json, skipping file migration.');
    return;
  }

  const files = Array.isArray(parsed.files) ? parsed.files : [];
  const payloads = files
    .map((file) => {
      if (!file) return null;
      const roomKey = normalizeRoomId(file.roomId);
      const roomUuid = roomIdMap.get(roomKey) || null;
      const uploaderId = isUuid(file.uploaderId) && userMap.has(file.uploaderId)
        ? file.uploaderId
        : null;
      const storagePath =
        file.storagePath ||
        file.storage?.originalKey ||
        file.storage?.originalDiskName ||
        file.id;

      if (!storagePath) return null;

      return {
        room_id: roomUuid,
        uploader_id: uploaderId,
        filename: file.originalName || file.filename || file.id || 'unknown',
        mime_type: file.mimeType || null,
        size: Number(file.size || 0),
        storage_path: storagePath,
        thumbnail_path: file.storage?.thumbnailKey || file.storage?.thumbnailDiskName || null,
        created_at: toDate(file.createdAt).toISOString()
      };
    })
    .filter(Boolean);

  for (const chunk of chunkArray(payloads)) {
    const { error } = await supabase.from('files').insert(chunk);
    if (error) {
      console.warn('Failed to insert files chunk:', error.message);
    }
  }

  console.log(`✅ Files migrated: ${payloads.length}`);
}

async function migrateChatMessages(redis, roomIdMap) {
  if (!redis) return;

  const keys = await redis.keys('chat:*');
  const payloads = [];

  for (const key of keys) {
    const rawRoomId = key.replace('chat:', '');
    const roomId = normalizeRoomId(rawRoomId);
    const roomUuid = roomIdMap.get(roomId) || null;
    const messages = await redis.getChatMessages(rawRoomId);

    messages.forEach((message) => {
      if (!message?.text) return;
      payloads.push({
        room_id: roomUuid,
        user_id: isUuid(message.userId) ? message.userId : null,
        message: String(message.text),
        created_at: toDate(message.timestamp).toISOString()
      });
    });
  }

  for (const chunk of chunkArray(payloads)) {
    const { error } = await supabase.from('chat_messages').insert(chunk);
    if (error) {
      console.warn('Failed to insert chat messages chunk:', error.message);
    }
  }

  console.log(`✅ Chat messages migrated: ${payloads.length}`);
}

async function migrateScanTasks(redis, roomIdMap) {
  if (!redis) return;

  const keys = await redis.keys('task:*');
  const payloads = [];

  for (const key of keys) {
    const taskId = key.replace('task:', '');
    const task = await redis.getTask(taskId);
    if (!task) continue;

    const roomUuid = task.roomId ? roomIdMap.get(normalizeRoomId(task.roomId)) : null;

    payloads.push({
      task_id: task.taskId || task.id || taskId,
      room_id: roomUuid,
      method: task.method || task.scanMethod || 'unknown',
      status: task.status || 'pending',
      input_files: task.inputFiles || task.input_files || null,
      output_url: task.outputUrl || task.output_url || null,
      created_at: toDate(task.createdAt || task.created_at).toISOString(),
      completed_at: task.completedAt || task.completed_at
        ? toDate(task.completedAt || task.completed_at).toISOString()
        : null
    });
  }

  for (const chunk of chunkArray(payloads)) {
    const { error } = await supabase.from('scan_tasks').insert(chunk);
    if (error) {
      console.warn('Failed to insert scan tasks chunk:', error.message);
    }
  }

  console.log(`✅ Scan tasks migrated: ${payloads.length}`);
}

async function main() {
  const redis = process.env.REDIS_URL ? getRedisClient() : null;
  if (redis) {
    await redis.connect();
  } else {
    console.warn('REDIS_URL not configured, Redis migration skipped.');
  }

  const userMap = await migrateUsers(redis);
  const roomIdMap = await migrateRooms(redis, userMap);

  await migrateFiles(roomIdMap, userMap);
  await migrateChatMessages(redis, roomIdMap);
  await migrateScanTasks(redis, roomIdMap);

  if (redis) {
    await redis.disconnect();
  }

  console.log('✅ Migration completed.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
