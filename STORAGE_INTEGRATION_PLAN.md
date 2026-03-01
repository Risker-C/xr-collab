# 存储平台集成方案

## 问题背景

根据代码审查发现的严重问题：
1. **数据丢失风险**：所有状态存在内存Map中，重启后数据全丢
2. **无法横向扩展**：单机内存存储，无法多实例部署
3. **内存爆炸**：大文件直接加载到内存
4. **写入风暴**：高频事件触发大量Redis写入

## 可用存储平台

Master提供的免费资源：

### 1. Supabase (PostgreSQL数据库)
- **用途**：持久化结构化数据
- **URL**：https://supabase.com/
- **需要的信息**：
  - ✅ Supabase项目URL（例如：`https://xxx.supabase.co`）
  - ✅ API密钥（`anon` public key 或 `service_role` key）
  - ✅ 数据库连接字符串（可选，用于直接SQL连接）

### 2. Upstash Redis
- **用途**：缓存、会话、实时数据
- **URL**：https://console.upstash.com/redis
- **需要的信息**：
  - ✅ Redis连接URL（例如：`redis://xxx.upstash.io:6379`）
  - ✅ Redis密码/Token

### 3. Cloudflare R2
- **用途**：大文件存储（3D模型、点云、图片）
- **优势**：无出站流量费用
- **需要的信息**：
  - ✅ Account ID
  - ✅ Access Key ID
  - ✅ Secret Access Key
  - ✅ Bucket名称
  - ✅ Public URL（如果需要公开访问）

### 4. AWS S3
- **用途**：备用大文件存储
- **需要的信息**：
  - ✅ AWS Access Key ID
  - ✅ AWS Secret Access Key
  - ✅ Region（例如：`us-east-1`）
  - ✅ Bucket名称

### 5. Google Drive
- **用途**：备份、归档、大文件分享
- **需要的信息**：
  - ✅ Service Account JSON密钥文件
  - ✅ 或OAuth2客户端凭据

## 推荐架构设计

### 数据分层存储策略

```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Express)                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Upstash Redis│   │   Supabase   │   │ Cloudflare R2│
│   (缓存层)    │   │  (持久层)     │   │  (文件层)     │
└──────────────┘   └──────────────┘   └──────────────┘
  • 会话数据         • 用户账户         • 3D模型
  • 在线用户         • 房间元数据       • 点云文件
  • 实时状态         • 聊天历史         • 上传图片
  • 限流计数         • 文件元数据       • 缩略图
  • 任务队列         • 审计日志         • 扫描结果
```

### 具体数据映射

#### 1. Upstash Redis（热数据，TTL管理）
```javascript
// ��前内存Map → Redis迁移
rooms (Map)           → redis:room:{roomId}           TTL: 24h
users (Map)           → redis:user:{userId}           TTL: 1h
onlineUsers (Set)     → redis:online:users            TTL: 5m
chatMessages (Array)  → redis:chat:{roomId}           TTL: 7d
rateLimiters (Map)    → redis:ratelimit:{ip}:{path}   TTL: 10m
taskCache (Map)       → redis:task:{taskId}           TTL: 1h
```

#### 2. Supabase PostgreSQL（冷数据，永久存储）
```sql
-- 数据库表设计
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  uploader_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  storage_path TEXT,  -- R2/S3路径
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  room_id UUID REFERENCES rooms(id),
  method TEXT NOT NULL, -- 'ml-sharp', 'zhitianxia', 'kiri'
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  input_files JSONB,
  output_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

#### 3. Cloudflare R2（大文件，公开访问）
```
存储路径结构：
/uploads/{roomId}/{fileId}/{filename}
/thumbnails/{roomId}/{fileId}/thumb.webp
/models/{taskId}/output.glb
/pointclouds/{scanId}/data.ply
```

## 实施优先级

### Phase 1: 紧急修复（1-2天）
**目标**：解决数据丢失和内存爆炸问题

1. **集成Upstash Redis**
   - 迁移rooms/users/chat到Redis
   - 实现Redis持久化层
   - 添加TTL管理
   - **需要**：Redis连接URL + 密码

2. **集成Cloudflare R2**
   - 文件上传直接到R2
   - 点云流式读取（不加载到内存）
   - 缩略图存储到R2
   - **需要**：R2 Access Key + Bucket名称

### Phase 2: 数据持久化（3-5天）
**目标**：实现完整的数据持久化

3. **集成Supabase**
   - 创建数据库表结构
   - 实现用户/房间/文件元数据持久化
   - 聊天历史归档
   - **需要**：Supabase URL + API Key

4. **实现数据同步**
   - Redis → Supabase定期同步
   - 冷热数据分离
   - 数据恢复机制

### Phase 3: 优化扩展（1周）
**目标**：支持横向扩展和高可用

5. **Socket.IO Redis Adapter**
   - 多实例WebSocket同步
   - 负载均衡支持

6. **CDN集成**
   - R2公开URL配置
   - 静态资源加速

## 环境变量配置

需要Master提供以下环境变量（添加到Render.com）：

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (可选)

# Upstash Redis
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
# 或者分开配置
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xr-collab-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev (可选)

# AWS S3 (备用)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=xr-collab-backup

# Google Drive (备用)
GOOGLE_DRIVE_CLIENT_ID=xxx
GOOGLE_DRIVE_CLIENT_SECRET=xxx
GOOGLE_DRIVE_REFRESH_TOKEN=xxx
```

## 代码改动预估

### 需要修改的文件
1. `backend/server.js` - 添加存储初始化
2. `backend/rooms.js` - 迁移到Redis
3. `backend/file-manager.js` - 迁移到R2
4. `backend/scan-manager.js` - 流式读取点云
5. 新增：`backend/storage/` 目录
   - `redis-client.js` - Redis连接管理
   - `supabase-client.js` - Supabase连接
   - `r2-client.js` - R2文件操作
   - `storage-adapter.js` - 统一存储接口

### 代码量预估
- 新增代码：~800行
- 修改代码：~400行
- 总工作量：2-3天（Phase 1）

## 成本估算（免费额度）

| 平台 | 免费额度 | 预计使用 | 是否够用 |
|------|---------|---------|---------|
| Supabase | 500MB数据库 + 1GB文件 | ~100MB | ✅ 够用 |
| Upstash Redis | 10,000命令/天 | ~5,000/天 | ✅ 够用 |
| Cloudflare R2 | 10GB存储 + 无限出站 | ~2GB | ✅ 够用 |
| AWS S3 | 5GB存储 + 20,000请求 | 备用 | ✅ 够用 |

## 下一步行动

**Master需要提供**（按优先级）：

### 🔴 Phase 1（紧急）
1. **Upstash Redis**：
   - [ ] Redis连接URL
   - [ ] Redis密码/Token

2. **Cloudflare R2**：
   - [ ] Account ID
   - [ ] Access Key ID
   - [ ] Secret Access Key
   - [ ] Bucket名称（建议：`xr-collab-storage`）

### 🟡 Phase 2（重要）
3. **Supabase**：
   - [ ] 项目URL
   - [ ] Anon Key
   - [ ] Service Role Key（可选）

### 🟢 Phase 3（可选）
4. **AWS S3**（备用）
5. **Google Drive**（归档）

## 实施计划

一旦Master提供Phase 1的凭据，我将：

1. ✅ 创建存储适配器代码
2. ✅ 实现Redis迁移
3. ✅ 实现R2文件上传
4. ✅ 更新环境变量配置
5. ✅ 测试并部署
6. ✅ 验证数据持久化

**预计完成时间**：收到凭据后2-3小时内完成Phase 1部署。

---

*创建时间：2026-03-01 10:10*
*创建者：伊卡洛斯*
