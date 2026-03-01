# XR Collab 部署修复指南

## 问题诊断

**当前状态**：
- ✅ 前端已部署：https://xr-collab.vercel.app/
- ❌ 后端未部署：前端无法连接后端，所有功能无法使用

**根本原因**：
1. Railway上部署的是 `lightweight-distributed-ai` 项目（Python worker），不是XR Collab后端
2. 前端配置中的默认后端地址 `https://xr-collab-backend.onrender.com` 尚未部署
3. XR Collab后端需要单独部署到Render.com

---

## 快速修复方案

### 方案1：Render.com 自动部署（推荐）

#### 步骤：

1. **访问 Render.com**
   - 打开：https://render.com/
   - 使用GitHub登录

2. **创建新服务**
   - 点击 "New +" → "Web Service"
   - 选择仓库：`Risker-C/xr-collab`
   - Render会自动检测 `render.yaml` 配置

3. **确认配置**
   - Name: `xr-collab-backend`
   - Runtime: Node
   - Build Command: `cd backend && npm install`
   - Start Command: `node backend/server.js`
   - Plan: Free

4. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成（约3-5分钟）
   - 部署完成后，Render会提供一个URL：`https://xr-collab-backend.onrender.com`

5. **验证部署**
   ```bash
   curl https://xr-collab-backend.onrender.com/api/status
   ```
   应该返回：`{"status":"ok"}`

6. **测试前端**
   - 访问：https://xr-collab.vercel.app/scan/
   - 功能应该恢复正常

---

### 方案2：Railway 部署（需要新建项目）

如果Master希望继续使用Railway：

1. **创建新Railway项目**
   ```bash
   # 在Railway控制台创建新项目
   # 连接到 GitHub: Risker-C/xr-collab
   # 设置Root Directory: backend/
   ```

2. **添加环境变量**
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=xr-collab-secret-key-2026
   RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
   KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
   ALLOWED_ORIGINS=https://xr-collab.vercel.app,https://xr-collab-*.vercel.app
   ```

3. **获取Railway域名**
   - Railway会生成一个域名，例如：`https://xr-collab-backend-production.up.railway.app`

4. **更新前端配置**
   - 修改 `frontend/lib/config.ts`：
     ```typescript
     export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://xr-collab-backend-production.up.railway.app'
     ```
   - 提交并推送到GitHub
   - Vercel会自动重新部署前端

---

## 推荐选择

**推荐使用方案1（Render.com）**，原因：
1. ✅ 配置文件已经准备好（`render.yaml`）
2. ✅ 前端默认配置已经指向Render地址
3. ✅ 无需修改代码，推送后自动部署
4. ✅ Render免费套餐稳定性较好

---

## 部署后验证清单

- [ ] 后端健康检查通过：`curl <BACKEND_URL>/api/status`
- [ ] Socket.io连接测试：访问前端并打开浏览器控制台，检查是否有WebSocket连接
- [ ] VR模式测试：访问 `/vr` 页面，尝试加入房间
- [ ] 扫描模式测试：访问 `/scan` 页面，尝试上传图片

---

## 当前配置

**仓库**：https://github.com/Risker-C/xr-collab
**前端部署**：https://xr-collab.vercel.app/
**后端配置**：
- 默认地址：`https://xr-collab-backend.onrender.com`
- CORS白名单：`https://xr-collab.vercel.app`
- Worker URLs：Railway + Koyeb

**最新提交**：5d03a04 - feat: 添加Render.com部署配置，修复后端部署问题

---

*生成时间：2026-03-01 09:30*
*问题诊断：伊卡洛斯*
