# 混合路线3D重建服务部署指南

**项目**: xr-collab-real  
**版本**: v1.0.0  
**架构**: V0.3 (ML_Sharp) + V0.2 (知天下AI) + V0.1 (KIRI Engine)

---

## 🏗️ 系统架构

### 前端 (Vercel)
- **框架**: React + Three.js + WebXR
- **组件**: 方案选择器、AR引导、批量上传、质量对比
- **部署**: Vercel自动部署

### 后端 (Railway)
- **框架**: Express.js + Node.js
- **API**: 三套完整的API路由
- **存储**: 内存缓存 + 文件上传

### Workers (多平台)
- **V0.3**: Modal (ML_Sharp推理)
- **V0.2**: 知天下AI (SOG重建)
- **V0.1**: KIRI Engine (专业级)

---

## 🚀 部署步骤

### 1. 环境变量配置

```bash
# .env
# ML_Sharp (V0.3)
ML_SHARP_API_ENDPOINT=https://api.modal.com/v1/ml-sharp
ML_SHARP_API_KEY=your_modal_api_key

# 知天下AI (V0.2)
ZHITIANXIA_API_ENDPOINT=https://api.zhitianxia.ai
ZHITIANXIA_API_KEY=your_zhitianxia_api_key

# KIRI Engine (V0.1)
KIRI_API_ENDPOINT=https://api.kiriengine.com
KIRI_API_KEY=your_kiri_api_key

# 服务配置
PORT=3001
NODE_ENV=production
```

### 2. 前端部署 (Vercel)

```bash
# 1. 构建前端
cd frontend-v2
npm install
npm run build

# 2. Vercel部署
vercel --prod

# 3. 环境变量设置
vercel env add NEXT_PUBLIC_API_URL
# 输入: https://your-backend.railway.app
```

### 3. 后端部署 (Railway)

```bash
# 1. 连接Railway
railway login
railway link

# 2. 设置环境变量
railway variables set ML_SHARP_API_KEY=your_key
railway variables set ZHITIANXIA_API_KEY=your_key
railway variables set KIRI_API_KEY=your_key

# 3. 部署
railway up
```

### 4. Worker部署

#### V0.3 Modal部署
```bash
cd workers/ml-sharp
modal deploy handler.py
```

#### V0.2 知天下AI
- 无需部署，直接使用API

#### V0.1 KIRI Engine
- 无需部署，直接使用API

---

## 🔧 API端点

### V0.3 (ML_Sharp)
```
POST /api/ml-sharp/generate
GET  /api/ml-sharp/health
```

### V0.2 (知天下AI)
```
POST /api/zhitianxia/reconstruct
GET  /api/zhitianxia/task/:taskId
DELETE /api/zhitianxia/task/:taskId
GET  /api/zhitianxia/health
```

### V0.1 (KIRI Engine)
```
POST /api/kiri/upload
GET  /api/kiri/task/:taskId
DELETE /api/kiri/task/:taskId
GET  /api/kiri/pricing
POST /api/kiri/estimate
GET  /api/kiri/account
GET  /api/kiri/health
```

---

## 📊 监控和日志

### 健康检查端点
```bash
# 检查所有服务状态
curl https://your-backend.railway.app/api/ml-sharp/health
curl https://your-backend.railway.app/api/zhitianxia/health
curl https://your-backend.railway.app/api/kiri/health
```

### 日志监控
```bash
# Railway日志
railway logs

# Vercel日志
vercel logs
```

---

## 💰 成本估算

### 免费层 (V0.3 + V0.2)
- **前端**: Vercel免费 (100GB带宽)
- **后端**: Railway免费 ($5/月后)
- **V0.3**: Modal免费层 (10小时/月)
- **V0.2**: 知天下AI免费
- **总成本**: $0-5/月

### 付费层 (包含V0.1)
- **V0.1**: KIRI Engine ($5-50/任务)
- **扩展**: Railway Pro ($20/月)
- **总成本**: $25-100/月 (取决于使用量)

---

## 🔒 安全配置

### API密钥管理
- 所有API密钥存储在环境变量中
- 前端不暴露任何密钥
- 使用HTTPS加密传输

### 文件上传限制
- V0.3: 单文件10MB
- V0.2: 单文件10MB，最多100张
- V0.1: 单文件50MB，最多200张

### 速率限制
```javascript
// 建议在生产环境添加
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 最多100个请求
})

app.use('/api/', limiter)
```

---

## 🧪 测试

### 端到端测试
```bash
# 1. V0.3测试
curl -X POST https://your-backend.railway.app/api/ml-sharp/generate \
  -F "image=@test.jpg"

# 2. V0.2测试
curl -X POST https://your-backend.railway.app/api/zhitianxia/reconstruct \
  -F "photos=@test1.jpg" -F "photos=@test2.jpg"

# 3. V0.1测试
curl -X POST https://your-backend.railway.app/api/kiri/upload \
  -F "photos=@test1.jpg" -F "qualityLevel=standard"
```

### 前端测试
```bash
cd frontend-v2
npm run test
npm run e2e
```

---

## 📈 性能优化

### 前端优化
- Three.js模型LOD
- 图片懒加载
- WebXR性能监控

### 后端优化
- Redis缓存 (生产环境)
- CDN文件存储
- 负载均衡

### 数据库 (可选)
```sql
-- 任务状态表
CREATE TABLE tasks (
  id VARCHAR(255) PRIMARY KEY,
  type ENUM('ml_sharp', 'zhitianxia', 'kiri'),
  status ENUM('processing', 'completed', 'failed'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);
```

---

## 🚨 故障排除

### 常见问题

1. **API密钥错误**
   ```
   Error: API key未配置
   解决: 检查环境变量设置
   ```

2. **文件上传失败**
   ```
   Error: 文件过大
   解决: 检查文件大小限制
   ```

3. **模型加载失败**
   ```
   Error: 模型URL无效
   解决: 检查CORS设置和URL有效性
   ```

### 调试命令
```bash
# 检查环境变量
railway variables

# 查看实时日志
railway logs --tail

# 重启服务
railway redeploy
```

---

## 📞 支持

- **文档**: [GitHub Wiki](https://github.com/your-repo/xr-collab/wiki)
- **问题**: [GitHub Issues](https://github.com/your-repo/xr-collab/issues)
- **邮箱**: support@your-domain.com

---

**部署完成后，访问前端URL即可使用完整的混合路线3D重建服务！**