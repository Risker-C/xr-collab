# 安全审查报告

## 🔴 严重安全问题 (Critical)
- **未鉴权的文件上传 + 可伪造上传者**：任何人可向任意房间上传文件并伪造 uploaderId/uploaderName，可能导致内容注入与存储滥用。位置：`backend/server.js:623-704` | 风险等级：High
- **文件访问缺少房间权限校验**：`/api/files/:fileId/content` 仅校验 JWT，但未检查房间成员权限；同时 optimized/thumbnail 端点完全公开，导致跨房间文件泄露。位置：`backend/server.js:736-779` | 风险等级：High
- **未鉴权的 Worker 执行接口**：公开的 `/api/worker/execute` 允许任意任务触发远程 worker 调用，可能被滥用造成成本/资源损耗或数据滥用。位置：`backend/server.js:906-913` | 风险等级：High
- **大文件内存上传导致 DoS**：KIRI/知天下AI 接口使用 `multer.memoryStorage()` 且单次可达 200×50MB（或 100×10MB），攻击者可直接耗尽内存。位置：`backend/routes/kiri.js:21-27`, `backend/routes/zhitianxia.js:18-24` | 风险等级：High

## 🟡 安全警告 (Warning)
- **登录接口无真实鉴权**：仅需提交用户名即可获取 JWT，易被冒充或滥用。位置：`backend/server.js:558-564`
- **房间密码哈希无盐且强度不足**：使用单次 SHA-256，易遭离线暴力破解。位置：`backend/rooms.js:38-41`
- **文件类型校验仅依赖 MIME**：上传接口未使用已有的魔数检测（FileTypeValidator），可伪造类型绕过。位置：`backend/server.js:623-673`, `backend/file-type-validator.js`
- **限流基于可伪造的 X-Forwarded-For**：未设置 `trust proxy` 时可能被伪造 IP 绕过；且内存 Map 不适合多实例。位置：`backend/rate-limiter.js:82-87`
- **遗留前端存在 XSS 风险**：`innerHTML` 拼接未做转义，若白板/扫描数据可控可能注入脚本。位置：`frontend-old/lib/whiteboard-system.js:932-935`, `frontend-old/scanning-ui.js:358-373`

## 🟢 安全建议 (Suggestion)
- 为 `/api/files/*`、`/api/worker/*`、`/api/kiri/*`、`/api/zhitianxia/*` 等高价值端点统一加鉴权与权限检查（房间成员/上传者校验）。
- 将 KIRI/知天下AI 上传改为 **磁盘流式** 或 **分片上传**，并限制单次总大小；补充速率限制。
- 在 `/api/files/upload` 集成 `FileTypeValidator` 的魔数检测，并考虑病毒扫描/内容安全检查。
- 采用 **bcrypt/argon2/scrypt** 为房间密码加盐哈希。
- 避免 `innerHTML` 渲染用户或远端数据，统一转义或使用 DOM API 安全拼接。
- 在反向代理场景启用 `app.set('trust proxy', true)` 并使用 Redis/共享存储的限流器。

## ✅ 良好安全实践
- JWT Secret 强制从环境变量注入，避免硬编码（`backend/auth.js`）。
- 关键接口已配置速率限制预设（`backend/rate-limiter.js`）。
- 扫描管理器对点云大小/持续时间做了限额，降低资源滥用风险（`backend/scan-manager.js`）。
- 移动端 SDK 后端使用 Helmet、Joi 校验和参数化 SQL，具备基础安全防护（`mobile-scan-sdk/backend/src/index.js`, `middleware/validation.js`, `repositories/deviceProfileRepository.js`）。
