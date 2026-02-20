# 🚀 XR Collab - 完整部署指南

## ✅ 推荐部署架构

```
前端（Vercel）     →  静态文件托管，全球CDN
    ↓ WebSocket
后端（Railway）    →  Node.js + Socket.IO，支持WebSocket
    ↓ HTTP/REST
Workers（已部署）  →  Railway + Koyeb 分布式计算
```

---

## 📦 快速部署（5分钟完成）

### 1️⃣ 部署后端到Railway

**方式A：通过GitHub（最简单）**

1. 访问 https://railway.app/new
2. 点击 "Deploy from GitHub repo"
3. 选择 `Risker-C/xr-collab`
4. Railway会自动检测并部署

**环境变量配置**：
```
JWT_SECRET=your-random-secret-key-here
RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
NODE_ENV=production
PORT=3001
```

5. 部署完成后，获取域名（例如：`xr-collab-backend.up.railway.app`）
6. 记住这个域名，下一步会用到

**方式B：使用Railway CLI**
```bash
# 安装CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
cd xr-collab
railway init

# 链接到项目
railway link

# 设置环境变量
railway variables set JWT_SECRET=your-secret-key

# 部署
railway up

# 获取部署URL
railway domain
```

---

### 2️⃣ 更新前端配置

编辑 `frontend/app.js`，找到第91行：

```javascript
// 修改前：
socket = io('http://localhost:3001');

// 修改后（替换为你的Railway域名）：
socket = io('https://xr-collab-backend.up.railway.app');
```

提交更改：
```bash
git add frontend/app.js
git commit -m "Update backend URL for production"
git push
```

---

### 3️⃣ 部署前端到Vercel

**方式A：通过Vercel网站（最简单）**

1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository"
3. 输入：`https://github.com/Risker-C/xr-collab`
4. 点击 "Import"
5. 配置：
   - Framework Preset: Other
   - Root Directory: `frontend`
   - Build Command: (留空)
   - Output Directory: `.`
6. 点击 "Deploy"
7. 等待1-2分钟，完成！

**方式B：使用Vercel CLI**
```bash
# 安装CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd xr-collab
vercel --prod

# 设置环境变量（如果需要）
vercel env add BACKEND_URL production
```

---

## 🎉 部署完成

访问你的Vercel域名（例如：`xr-collab.vercel.app`），开始使用！

---

## 🔄 自动部署

配置完成后，每次你推送代码到GitHub：
- ✅ Railway自动重新部署后端
- ✅ Vercel自动重新部署前端

---

## 🌍 其他平台选择

### 后端替代方案

#### Render（免费，支持WebSocket）
1. https://render.com/new/web
2. 连接GitHub仓库
3. 设置：
   - Build Command: `npm install`
   - Start Command: `node backend/server.js`
4. 添加环境变量
5. 部署

#### Fly.io（全栈部署）
```bash
# 安装CLI
curl -L https://fly.io/install.sh | sh

# 登录
flyctl auth login

# 初始化
flyctl launch

# 部署
flyctl deploy
```

### 前端替代方案

#### Netlify
```bash
# 安装CLI
npm install -g netlify-cli

# 登录
netlify login

# 部署
cd xr-collab/frontend
netlify deploy --prod
```

#### Cloudflare Pages
1. https://pages.cloudflare.com
2. 连接GitHub
3. 设置构建目录为 `frontend`
4. 部署

---

## 📊 生产环境检查清单

- [ ] 后端已部署并可访问
- [ ] 前端已更新后端URL
- [ ] 环境变量已配置
- [ ] HTTPS已启用（Vercel/Railway自动提供）
- [ ] Workers健康检查正常
- [ ] WebSocket连接测试通过
- [ ] 多人协作测试通过

---

## 🐛 故障排查

### 问题：前端无法连接后端
**解决**：
1. 检查 `frontend/app.js` 中的后端URL是否正确
2. 确保后端已启动：访问 `https://your-backend.railway.app/health`
3. 检查浏览器控制台是否有CORS错误

### 问题：WebSocket连接失败
**解决**：
1. 确保后端部署在支持WebSocket的平台（Railway/Render）
2. 检查后端日志
3. 尝试刷新页面

### 问题：Workers不工作
**解决**：
1. Workers是可选的，不影响基本功能
2. 检查环境变量中的Worker URL是否正确
3. 手动测试Worker：
```bash
curl https://lightweight-distributed-ai-production.up.railway.app/health
```

---

## 💰 费用说明

### 免费套餐

**Railway**：
- ✅ 每月 $5 免费额度
- ✅ 512MB RAM
- ✅ 支持WebSocket

**Vercel**：
- ✅ 100GB带宽/月
- ✅ 全球CDN
- ✅ 自动HTTPS

**Workers（已部署）**：
- ✅ Railway: 免费额度内
- ✅ Koyeb: 免费套餐

总计：**完全免费** 🎉

---

## 📈 性能优化

### 1. 添加Redis（可选）

**Railway添加Redis**：
1. 项目中点击 "New Service"
2. 选择 "Database" → "Redis"
3. 获取连接URL
4. 在后端环境变量中添加 `REDIS_URL`

### 2. CDN加速
- Vercel自动提供全球CDN
- 静态资源自动缓存

### 3. 监控和日志
```bash
# Railway查看日志
railway logs

# Vercel查看日志
vercel logs
```

---

## 🔐 安全建议

1. **JWT密钥**：使用强随机密钥
   ```bash
   # 生成随机密钥
   openssl rand -base64 32
   ```

2. **CORS配置**：限制允许的域名
   编辑 `backend/server.js` 添加CORS白名单

3. **速率限制**：防止滥用
   ```bash
   npm install express-rate-limit
   ```

---

## 📞 获取帮助

- **项目文档**：[README.md](https://github.com/Risker-C/xr-collab)
- **快速开始**：[QUICKSTART.md](https://github.com/Risker-C/xr-collab/blob/main/QUICKSTART.md)
- **使用指南**：[USAGE.md](https://github.com/Risker-C/xr-collab/blob/main/USAGE.md)

---

## 🎊 下一步

部署完成后，你可以：
1. 🎮 邀请朋友测试多人协作
2. 🥽 使用VR设备体验沉浸式协作
3. 🔧 自定义Avatar和场景
4. 📱 分享到社交媒体

**祝你部署顺利！** 🚀
