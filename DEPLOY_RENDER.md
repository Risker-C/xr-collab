# 🚀 后端部署 - Render.com（推荐替代方案）

Railway需要交互式登录，Render.com更简单，完全通过网页操作。

## 📦 使用Render部署后端

### 1. 打开Render
访问：https://render.com/

### 2. 注册/登录
- 使用GitHub账号登录（推荐）
- 或者邮箱注册

### 3. 创建新服务
- 点击 **"New +"** 按钮
- 选择 **"Web Service"**

### 4. 连接GitHub仓库
- 点击 **"Connect a repository"**
- 授权Render访问GitHub
- 选择 **"Risker-C/xr-collab"**

### 5. 配置服务

```
Name: xr-collab-backend
Region: Singapore (或离您最近的)
Branch: main
Root Directory: (留空)
Runtime: Node
Build Command: npm install
Start Command: node backend/server.js
Instance Type: Free
```

### 6. 添加环境变量

点击 **"Advanced"**，添加环境变量：

```
JWT_SECRET=xr-collab-secret-2026-random-key
RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
NODE_ENV=production
PORT=10000
```

**注意**: Render使用端口10000，不是3001

### 7. 部署
- 点击 **"Create Web Service"**
- 等待5-10分钟（首次部署较慢）
- 部署完成后，复制域名（例如：`xr-collab-backend.onrender.com`）

### 8. 测试
访问：`https://xr-collab-backend.onrender.com`

---

## 🎯 Render vs Railway

| 特性 | Render | Railway |
|------|--------|---------|
| 免费额度 | 750小时/月 | $5免费额度 |
| 部署方式 | 纯网页操作 | 需要CLI或授权 |
| 冷启动 | 有（15秒） | 无 |
| WebSocket | ✅ 支持 | ✅ 支持 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**推荐使用Render**，因为：
- 完全网页操作，无需CLI
- 免费额度充足
- 支持WebSocket
- 部署简单

---

## ✅ 完成后

部署成功后，告诉我Render域名，我会帮您更新前端配置！

例如：`https://xr-collab-backend.onrender.com`

🍉