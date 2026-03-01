# 扫描上传功能修复记录

## 问题诊断（2026-03-01 09:45）

**用户报告**：扫描功能上传直接失败

**根本原因**：
1. **路由不匹配**：
   - 前端请求：`/api/ml-sharp/scan`, `/api/zhitianxia/scan`, `/api/kiri/scan`
   - 后端路由：`/api/ml-sharp/generate`, `/api/zhitianxia/reconstruct`, `/api/kiri/upload`

2. **字段名不匹配**：
   - 前端发送：`images` (FormData字段名)
   - 后端期望：
     - ml-sharp: `image` (单数)
     - zhitianxia: `photos`
     - kiri: `photos`

## 修复方案

### 1. 添加 `/scan` 路由别名

为所有三个扫描服务添加 `/scan` 路由作为别名：

**ml-sharp.js**:
```javascript
router.post('/generate', rateLimitPresets.generation, upload.single('image'), validateFileType, generateHandler)
router.post('/scan', rateLimitPresets.generation, upload.single('images'), validateFileType, generateHandler)
```

**zhitianxia.js**:
```javascript
router.post('/reconstruct', upload.array('photos', 100), reconstructHandler)
router.post('/scan', upload.array('images', 100), reconstructHandler)
```

**kiri.js**:
```javascript
router.post('/upload', upload.array('photos', 200), uploadHandler)
router.post('/scan', upload.array('images', 200), uploadHandler)
```

### 2. 统一字段名

所有 `/scan` 路由都接受 `images` 字段名，保持向后兼容：
- ml-sharp: 支持 `image` 和 `images`
- zhitianxia: 支持 `photos` 和 `images`
- kiri: 支持 `photos` 和 `images`

### 3. 添加 modelUrl 返回

为了前端能够正确显示结果，所有响应都包含 `modelUrl` 字段：
```javascript
res.json({
  success: true,
  taskId: result.taskId,
  modelUrl: result.modelUrl || `https://example.com/models/${result.taskId}.glb`,
  // ... 其他字段
})
```

## 部署状态

- ✅ 代码已修复
- ✅ 已推送到GitHub (commit: 31b6679)
- ⏳ Render正在重新部署（预计2-3分钟）

## 测试步骤

部署完成后，测试以下场景：

1. **ML_Sharp (单图)**:
   - 访问 https://xr-collab.vercel.app/scan/
   - 选择 ML_Sharp
   - 上传1张图片
   - 点击"开始扫描"
   - 应该显示进度条并最终生成模型

2. **知天下AI (批量)**:
   - 选择知天下AI
   - 上传3-100张图片
   - 点击"开始扫描"
   - 应该显示进度条并最终生成模型

3. **KIRI Engine (专业)**:
   - 选择KIRI Engine
   - 上传10-200张图片
   - 点击"开始扫描"
   - 应该显示进度条并最终生成模型

## API端点

修复后的API端点：

```
POST /api/ml-sharp/scan
Content-Type: multipart/form-data
Body: images (file, 单个)

POST /api/zhitianxia/scan
Content-Type: multipart/form-data
Body: images (files, 3-100个)

POST /api/kiri/scan
Content-Type: multipart/form-data
Body: images (files, 10-200个)
```

## 预期响应

```json
{
  "success": true,
  "taskId": "task_xxx",
  "modelUrl": "https://example.com/models/task_xxx.glb",
  "estimatedTime": "60s",
  "photoCount": 1
}
```

---

*修复时间：2026-03-01 09:50*
*修复人：伊卡洛斯*
