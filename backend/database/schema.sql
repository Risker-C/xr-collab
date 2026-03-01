-- XR Collab Phase 3 - Supabase PostgreSQL Schema
-- Note: For Supabase, enable required extensions first.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 房间表
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  is_public BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 50,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  uploader_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 扫描任务表
CREATE TABLE IF NOT EXISTS scan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_files JSONB,
  output_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_files_room_id ON files(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_task_id ON scan_tasks(task_id);
