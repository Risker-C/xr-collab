# ML_Sharp Modal Deployment

V0.3 (ML_Sharp) 推理服务的Modal部署配置

## 功能

- **单图转3D生成**: 上传一张图片，生成glb格式的3D模型
- **环境识别分析**: 分析室内环境，生成拍摄路径建议
- **GPU加速**: 使用T4 GPU进行快速推理

## 部署步骤

### 1. 安装Modal CLI

```bash
pip install modal
```

### 2. 登录Modal

```bash
modal token new
```

### 3. 部署服务

```bash
cd workers/ml-sharp
modal deploy handler.py
```

### 4. 获取端点URL

部署成功后，Modal会提供API端点URL，格式类似：
```
https://your-username--ml-sharp-service-generate-3d.modal.run
```

### 5. 配置环境变量

在后端`.env`文件中添加：

```env
# Modal配置
MODAL_ENDPOINT=https://your-username--ml-sharp-service.modal.run
MODAL_API_KEY=your-modal-api-key
```

## API接口

### 生成3D模型

**端点**: `POST /generate_3d`

**请求**:
```json
{
  "image_base64": "base64编码的图片数据"
}
```

**响应**:
```json
{
  "modelUrl": "https://cdn.example.com/models/xxx.glb",
  "roomType": "living_room",
  "confidence": 0.85,
  "processingTime": 2.5,
  "modelSize": 1048576
}
```

### 环境分析

**端点**: `POST /analyze_environment`

**请求**:
```json
{
  "image_base64": "base64编码的图片数据"
}
```

**响应**:
```json
{
  "roomType": "living_room",
  "capturePoints": [
    {
      "position": [0, 1.6, 0],
      "angle": 0,
      "priority": 1
    }
  ],
  "suggestedAngles": [0, 45, 90, 135, 180, 225, 270, 315],
  "estimatedPhotos": 20,
  "confidence": 0.80
}
```

### 健康检查

**端点**: `GET /health_check`

**响应**:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## 本地测试

```bash
cd workers/ml-sharp
modal run handler.py
```

## 监控和日志

### 查看日志
```bash
modal logs ml-sharp-service
```

### 查看使用情况
```bash
modal stats ml-sharp-service
```

## 成本优化

### GPU使用
- 使用T4 GPU（成本较低）
- 设置合理的超时时间（5分钟）
- 考虑使用CPU进行简单任务

### 内存优化
- 生成任务：4GB内存
- 分析任务：2GB内存
- 根据实际需求调整

### 并发控制
```python
@stub.function(
    concurrency_limit=10,  # 限制并发数
    keep_warm=2  # 保持2个实例热启动
)
```

## 故障排除

### 常见问题

1. **部署失败**
   - 检查Modal CLI是否已登录
   - 确认依赖包是否正确

2. **推理超时**
   - 增加timeout设置
   - 检查GPU资源是否充足

3. **内存不足**
   - 增加memory设置
   - 优化模型加载方式

### 调试技巧

1. **本地测试**
   ```bash
   modal run handler.py
   ```

2. **查看详细日志**
   ```bash
   modal logs ml-sharp-service --follow
   ```

3. **性能监控**
   ```bash
   modal stats ml-sharp-service --detailed
   ```

## 生产环境配置

### 环境变量
```env
# 生产环境
MODAL_ENVIRONMENT=production
MODAL_ENDPOINT=https://prod--ml-sharp-service.modal.run
MODAL_API_KEY=prod-api-key

# CDN配置（用于模型文件存储）
CDN_BASE_URL=https://cdn.example.com
CDN_API_KEY=your-cdn-key
```

### 安全配置
- 使用HTTPS端点
- 配置API密钥认证
- 限制请求频率

### 扩展配置
```python
@stub.function(
    gpu="A10G",  # 升级到更强GPU
    memory=8192,  # 8GB内存
    concurrency_limit=50,  # 更高并发
    keep_warm=5  # 更多热启动实例
)
```

## 更新日志

- **v0.1.0**: 初始版本，支持基础生成和分析功能
- **TODO**: 集成真实的ML_Sharp模型
- **TODO**: 实现CDN上传功能
- **TODO**: 添加更多房间类型识别

## 相关链接

- [Modal文档](https://modal.com/docs)
- [ML_Sharp官方文档](https://github.com/apple/ml-sharp)
- [项目主页](https://github.com/Risker-C/xr-collab)