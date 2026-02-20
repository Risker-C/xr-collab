# Vercel 部署指南

## 🚀 一键部署到Vercel

### 方式一：通过GitHub自动部署（推荐）

1. **导入项目到Vercel**
   - 访问 https://vercel.com/new
   - 选择 "Import Git Repository"
   - 输入: `https://github.com/Risker-C/xr-collab`
   - 点击 "Import"

2. **配置环境变量**
   在Vercel项目设置中添加：
   ```
   JWT_SECRET=your-random-secret-key-here
   RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
   KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
   NODE_ENV=production
   ```

3. **部署**
   - 点击 "Deploy"
   - 等待1-2分钟
   - 完成！🎉

### 方式二：使用Vercel CLI

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd xr-collab
vercel

# 4. 设置环境变量
vercel env add JWT_SECRET
# 输入你的密钥

# 5. 生产部署
vercel --prod
```

---

## 🌐 部署后的URL

部署成功后，你会得到：
- **生产URL**: `https://xr-collab.vercel.app`
- **预览URL**: `https://xr-collab-xxx.vercel.app`（每次提交自动生成）

---

## ⚠️ Vercel限制说明

### WebSocket支持
Vercel对WebSocket有限制，Socket.IO可能需要降级到轮询模式。

**解决方案**：
1. 前端会自动降级到HTTP长轮询
2. 或者后端部署到Railway/Render（支持WebSocket）

### 推荐架构
```
前端（静态文件） → Vercel
后端（WebSocket） → Railway/Render
Workers → Railway + Koyeb（已部署）
```

---

## 🔧 混合部署方案

### 前端：Vercel
```bash
# 只部署前端到Vercel
vercel --prod frontend/
```

### 后端：Railway

1. 访问 https://railway.app
2. 点击 "New Project" → "Deploy from GitHub"
3. 选择 `xr-collab` 仓库
4. 设置启动命令：`node backend/server.js`
5. 添加环境变量
6. 部署完成后获得URL：`https://xr-collab-backend.railway.app`

### 更新前端配置
编辑 `frontend/app.js`：
```javascript
// 修改Socket.IO连接地址
socket = io('https://xr-collab-backend.railway.app');
```

---

## 🎯 完整部署步骤（推荐）

### 1. 后端部署到Railway

```bash
# 使用Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

或通过网页：
- https://railway.app/new
- 选择GitHub仓库
- 设置根目录为 `backend/`
- 添加环境变量

### 2. 前端部署到Vercel

```bash
vercel --prod
```

### 3. 更新前端API地址

编辑 `frontend/app.js`：
```javascript
const BACKEND_URL = 'https://your-backend.railway.app';
socket = io(BACKEND_URL);
```

重新部署：
```bash
vercel --prod
```

---

## 🌟 其他部署平台

### Netlify（前端）
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=frontend
```

### Render（后端）
- https://render.com
- 支持WebSocket
- 免费套餐可用

### Fly.io（全栈）
```bash
flyctl launch
flyctl deploy
```

---

## 📊 性能优化

### CDN加速
Vercel自动提供全球CDN，无需额外配置。

### 缓存策略
在 `vercel.json` 中添加：
```json
{
  "headers": [
    {
      "source": "/frontend/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🔐 环境变量管理

### 生产环境
```bash
vercel env add JWT_SECRET production
vercel env add RAILWAY_WORKER_URL production
vercel env add KOYEB_WORKER_URL production
```

### 预览环境
```bash
vercel env add JWT_SECRET preview
```

### 本地开发
```bash
vercel env pull
```

---

## 🐛 常见问题

### Q: WebSocket连接失败？
A: Vercel不完全支持WebSocket，建议后端部署到Railway/Render

### Q: 部署后看不到页面？
A: 检查 `vercel.json` 路由配置，确保静态文件路径正确

### Q: 环境变量不生效？
A: 重新部署：`vercel --prod --force`

---

## 📞 获取帮助

- Vercel文档: https://vercel.com/docs
- Railway文档: https://docs.railway.app
- 项目Issues: https://github.com/Risker-C/xr-collab/issues

---

**开始部署吧！** 🚀
