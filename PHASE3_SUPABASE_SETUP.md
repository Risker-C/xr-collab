# XR Collab Phase 3 - Supabase Setup Guide

## 1. Create a Supabase Project
1. Log in to https://supabase.com and create a new project.
2. Choose a region close to your users and set a secure database password.
3. After the project is ready, open **Project Settings → API**:
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **service_role** key → `SUPABASE_SERVICE_KEY`
   - (Optional) Copy **anon** key → `SUPABASE_ANON_KEY`

## 2. Create Database Tables
1. Open **SQL Editor** in Supabase.
2. Run the schema script located at:
   - `backend/database/schema.sql`
3. Confirm the tables exist: `users`, `rooms`, `files`, `chat_messages`, `scan_tasks`.

## 3. Configure Environment Variables
Update `backend/.env` (or `.env.credentials`) with:
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## 4. (Optional) Migrate Existing Data
If you have Redis/local metadata you want to migrate:
```bash
node backend/scripts/migrate.js
```
The script will:
- migrate users/rooms/chat/scan tasks from Redis
- migrate file metadata from `backend/storage/metadata.json`
- validate and skip invalid records

## 5. Validate
- Start the backend and check logs for `Supabase storage initialized`.
- Verify data exists in Supabase tables.
