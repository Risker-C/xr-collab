# run.claw.cloud 部署指南

## 🚀 部署到 run.claw.cloud

### 1. 准备部署文件

项目已包含必要的部署文件：
- `Dockerfile` - 容器化配置
- `package.json` - 依赖管理
- `backend/server.js` - 主服务器

### 2. 部署步骤

#### 方法一：Git仓库部署（推荐）
1. 访问 https://run.claw.cloud/
2. 点击 "New Service" 或 "创建服务"
3. 选择 "From Git Repository"
4. 输入仓库地址：`https://github.com/Risker-C/xr-collab.git`
5. 配置部署参数：
   ```
   Build Command: npm install
   Start Command: node backend/server.js
   Port: 3001
   ```

#### 方法二：Docker部署
1. 选择 "Docker Container"
2. 使用现有的 Dockerfile
3. 构建设置：
   ```
   Context: .
   Dockerfile: ./Dockerfile
   Port: 3001
   ```

### 3. 环境变量配置

在部署界面设置以下环境变量：

```bash
# 基础配置
NODE_ENV=production
PORT=3001

# Redis配置（如果需要）
REDIS_URL=redis://localhost:6379

# API密钥（根据需要配置）
MODAL_API_KEY=your_modal_key
KIRI_API_KEY=your_kiri_key
ZHITIANXIA_API_KEY=your_zhitianxia_key

# 安全配置
HTTP_AUTH_USERNAME=admin
HTTP_AUTH_PASSWORD=your_secure_password

# 文件存储
UPLOAD_MAX_SIZE=50mb
STORAGE_PATH=/app/storage
```

### 4. 资源配置建议

```yaml
# 推荐配置
CPU: 1-2 cores
Memory: 2-4 GB
Storage: 10-20 GB
```

### 5. 健康检查

run.claw.cloud会自动检查以下端点：
- `GET /health` - 健康检查
- `GET /api/status` - API状态

### 6. 域名配置

部署成功后：
1. 获取分配的域名（如：`your-app.run.claw.cloud`）
2. 可选：绑定自定义域名
3. 自动HTTPS证书

### 7. 监控和日志

- 实时日志：在控制台查看应用日志
- 性能监控：CPU、内存、网络使用情况
- 错误追踪：自动收集错误信息

### 8. 扩展配置

如需要扩展功能：
```bash
# 自动扩缩容
Min Instances: 1
Max Instances: 5
CPU Threshold: 70%
Memory Threshold: 80%
```

## 🔧 部署后验证

部署完成后，访问以下端点验证：

1. **健康检查**：`https://your-app.run.claw.cloud/health`
2. **API状态**：`https://your-app.run.claw.cloud/api/status`
3. **ML_Sharp API**：`https://your-app.run.claw.cloud/api/ml-sharp/status`
4. **WebSocket**：检查实时协作功能

## 📝 注意事项

1. **文件存储**：run.claw.cloud提供持久化存储
2. **WebSocket支持**：平台原生支持WebSocket连接
3. **负载均衡**：自动处理高并发请求
4. **SSL证书**：自动配置HTTPS
5. **CDN加速**：静态资源自动加速

## 🚨 常见问题

### 部署失败
- 检查Dockerfile语法
- 确认package.json依赖
- 查看构建日志

### 服务无法访问
- 确认端口配置（3001）
- 检查防火墙设置
- 验证健康检查端点

### 性能问题
- 增加CPU/内存配置
- 启用自动扩缩容
- 优化代码性能

## 📞 支持

如遇问题：
1. 查看run.claw.cloud文档
2. 检查应用日志
3. 联系平台技术支持