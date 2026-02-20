# ⚡ XR Collab - 立即部署

## 🎯 最简单的部署方式（3步完成）

### 步骤 1: 部署后端到Railway

1. 打开 https://railway.app/new
2. 点击 **"Deploy from GitHub repo"**
3. 授权并选择 **`Risker-C/xr-collab`**
4. Railway自动检测配置并开始部署
5. 点击项目 → **Settings** → **Generate Domain**
6. 复制域名（例如：`xr-collab-production.up.railway.app`）

**添加环境变量**：
- 点击 **Variables** 标签
- 添加以下变量：
  ```
  JWT_SECRET=请生成一个随机字符串
  RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
  KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
  NODE_ENV=production
  PORT=3001
  ```

---

### 步骤 2: 更新前端配置

在GitHub上编辑文件：

1. 打开 https://github.com/Risker-C/xr-collab/edit/main/frontend/app.js
2. 找到第91行，修改：
   ```javascript
   // 把这一行：
   socket = io('http://localhost:3001');
   
   // 改成（替换为你的Railway域名）：
   socket = io('https://xr-collab-production.up.railway.app');
   ```
3. 点击 **Commit changes**

---

### 步骤 3: 部署前端到Vercel

1. 打开 https://vercel.com/new
2. 点击 **"Import Git Repository"**
3. 输入：`https://github.com/Risker-C/xr-collab`
4. 点击 **"Import"**
5. 配置：
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - 其他保持默认
6. 点击 **"Deploy"**
7. 等待2分钟，完成！

---

## ✅ 完成！

访问你的Vercel域名（例如：`https://xr-collab.vercel.app`）

测试步骤：
1. 输入用户名和房间ID
2. 点击"Join Room"
3. 创建一些方块和球体
4. 邀请朋友加入相同房间ID，看到实时协作！

---

## 🔗 重要链接

- **GitHub仓库**: https://github.com/Risker-C/xr-collab
- **部署后检查**:
  - 后端健康检查: `https://your-backend.railway.app/health`（应该显示"OK"）
  - 前端: `https://your-frontend.vercel.app`
  - Workers: 已部署并自动连接

---

## 💡 提示

- 部署是完全免费的（使用免费套餐）
- Railway自动提供HTTPS
- Vercel自动提供全球CDN
- 每次推送代码到GitHub，都会自动重新部署

---

## 🆘 遇到问题？

### 问题1: Railway部署失败
**解决**: 确保GitHub仓库已授权给Railway

### 问题2: 前端连接不上后端
**解决**: 
1. 检查 `frontend/app.js` 第91行的URL是否正确
2. 确保后端域名已生成（Railway → Settings → Generate Domain）
3. 访问后端健康检查端点测试

### 问题3: Vercel部署失败
**解决**: 
1. 确保Root Directory设置为 `frontend`
2. Build Command留空
3. Output Directory设置为 `.`

---

**开始部署吧！只需要5分钟！** 🚀
