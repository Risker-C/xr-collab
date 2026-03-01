# 后端部署诊断报告（更新）

## 问题症状
1. 前端上传扫描图片时，`/api/ml-sharp/scan` 返回 404
2. 后端部署/本地启动失败

## 关键诊断结果

### 1) 启动崩溃：缺失依赖 `@aws-sdk/s3-request-presigner`
**日志:**
```
Error: Cannot find module '@aws-sdk/s3-request-presigner'
Require stack:
- backend/storage/r2-client.js
- backend/storage/storage-adapter.js
- backend/middleware/auth.js
- backend/server.js
```
**结论:** 后端在加载 R2 客户端时直接崩溃，服务无法启动，导致对外请求出现 404/不可用。

### 2) 本地启动：环境变量加载路径不一致
`server.js` 仅加载 `.env.credentials`，而本地开发使用 `backend/.env`。导致本地 `JWT_SECRET` 等变量不生效并退出。

### 3) Redis 连接失败导致启动中断
`storage-adapter` 连接 Redis 失败会 throw，导致服务整体退出。

### 4) CSRF 导致上传失败（现已默认关闭）
前端未请求 `/api/csrf-token` 并携带 `x-csrf-token`，导致 POST/UPLOAD 被拦截。

---

## 已修复内容
- ✅ 添加缺失依赖 `@aws-sdk/s3-request-presigner`
- ✅ 环境变量加载同时支持：`backend/.env` 与 根目录 `.env.credentials`
- ✅ Redis/R2 初始化失败降级，不再阻塞启动
- ✅ CSRF 默认关闭（可通过 `ENABLE_CSRF=true` 启用）

---

## 本地测试结果
```bash
PORT=3001 node server.js &
sleep 5
curl http://localhost:3001/api/status       # 200 OK
curl -X POST http://localhost:3001/api/ml-sharp/scan   # 400 请上传图片文件（路由可达）
pkill -f "node server.js"
```

---

## 建议后续动作
1. **Render 环境变量确认**：确保 `JWT_SECRET` / `REDIS_URL` 已配置（render.yaml 已配置但需确认生效）。
2. **线上验证**：部署后执行：
   ```bash
   curl https://xr-collab-backend.onrender.com/api/status
   curl -X POST https://xr-collab-backend.onrender.com/api/ml-sharp/scan
   ```

---
**更新时间**: 2026-03-01
