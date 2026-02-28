# run.claw.cloud 镜像部署指南

## 🚀 使用Docker镜像部署

### 1. 可用镜像

GitHub自动构建的镜像：
```
ghcr.io/risker-c/xr-collab:latest
ghcr.io/risker-c/xr-collab:main
```

### 2. 部署步骤

1. 访问 https://run.claw.cloud/
2. 点击 "New Service" 或 "创建服务"
3. 选择 "Docker Image"
4. 输入镜像地址：
   ```
   ghcr.io/risker-c/xr-collab:latest
   ```
5. 配置端口：`3001`
6. 设置环境变量（见下方）
7. 点击 "Deploy"

### 3. 环境变量配置

**必需变量**：
```bash
NODE_ENV=production
PORT=3001
HTTP_AUTH_USERNAME=admin
HTTP_AUTH_PASSWORD=your_secure_password
```

**可选变量**：
```bash
# Redis配置
REDIS_URL=redis://localhost:6379

# API密钥
MODAL_API_KEY=your_modal_key
KIRI_API_KEY=your_kiri_key
ZHITIANXIA_API_KEY=your_zhitianxia_key

# 文件存储
UPLOAD_MAX_SIZE=50mb
STORAGE_PATH=/app/storage
```

### 4. 资源配置

**推荐配置**：
```yaml
CPU: 1-2 cores
Memory: 2-4 GB
Storage: 10-20 GB (持久化)
Port: 3001
```

**自动扩缩容**：
```yaml
Min Instances: 1
Max Instances: 3
CPU Threshold: 70%
Memory Threshold: 80%
```

### 5. 健康检查

镜像内置健康检查：
- 端点：`/health`
- 间隔：30秒
- 超时：10秒
- 重试：3次

### 6. 存储卷配置

**持久化存储**：
```yaml
Volume Path: /app/storage
Size: 10GB
Type: Persistent
```

用于存储：
- 上传的图片
- 生成的3D模型
- 扫描数据
- 临时文件

### 7. 网络配置

**端口映射**：
- 容器端口：3001
- 协议：HTTP/WebSocket
- 健康检查：GET /health

**域名访问**：
- 自动分配：`your-app.run.claw.cloud`
- 自定义域名：支持绑定
- HTTPS：自动配置SSL证书

### 8. 镜像更新

**自动更新**：
- 每次推送到main分支自动构建新镜像
- 标签：`latest`, `main`, `sha-xxxxxx`

**手动更新**：
1. 在run.claw.cloud控制台
2. 选择服务 → Settings
3. 更新镜像标签
4. 重新部署

### 9. 监控和日志

**实时监控**：
- CPU/内存使用率
- 网络流量
- 请求响应时间
- 错误率统计

**日志查看**：
- 应用日志：实时流式输出
- 系统日志：容器启动/停止
- 错误日志：异常堆栈跟踪

### 10. 部署验证

部署成功后访问以下端点：

1. **健康检查**：
   ```
   GET https://your-app.run.claw.cloud/health
   ```

2. **API状态**：
   ```
   GET https://your-app.run.claw.cloud/api/status
   ```

3. **ML_Sharp状态**：
   ```
   GET https://your-app.run.claw.cloud/api/ml-sharp/status
   ```

4. **WebSocket测试**：
   ```javascript
   const socket = io('https://your-app.run.claw.cloud');
   ```

### 11. 故障排除

**常见问题**：

1. **镜像拉取失败**
   - 检查镜像地址是否正确
   - 确认GitHub Packages权限

2. **服务启动失败**
   - 查看启动日志
   - 检查环境变量配置
   - 验证端口设置

3. **健康检查失败**
   - 确认/health端点可访问
   - 检查应用是否正常启动
   - 验证端口3001是否监听

4. **存储问题**
   - 确认持久化卷已挂载
   - 检查/app/storage权限
   - 验证磁盘空间

### 12. 安全配置

**内置安全特性**：
- 非root用户运行
- HTTP基础认证
- 文件类型验证
- 请求速率限制
- CORS配置

**推荐设置**：
- 强密码认证
- 定期更新镜像
- 监控异常访问
- 备份重要数据

## 📞 技术支持

如遇问题：
1. 查看应用日志
2. 检查健康检查状态
3. 验证环境变量配置
4. 联系run.claw.cloud技术支持

---

**镜像信息**：
- 基础镜像：node:18-alpine
- 架构：linux/amd64, linux/arm64
- 大小：~200MB
- 更新频率：每次代码推送