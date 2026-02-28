# 🚀 run.claw.cloud 快速部署

## 镜像地址
```
ghcr.io/risker-c/xr-collab:latest
```

## 一键部署步骤

1. **访问平台**：https://run.claw.cloud/

2. **创建服务**：
   - 点击 "New Service"
   - 选择 "Docker Image"

3. **配置镜像**：
   ```
   Image: ghcr.io/risker-c/xr-collab:latest
   Port: 3001
   ```

4. **环境变量**（必需）：
   ```bash
   NODE_ENV=production
   PORT=3001
   HTTP_AUTH_USERNAME=admin
   HTTP_AUTH_PASSWORD=your_password
   ```

5. **资源配置**：
   ```
   CPU: 1 core
   Memory: 2 GB
   Storage: 10 GB (持久化挂载到 /app/storage)
   ```

6. **点击 Deploy** 🚀

## 验证部署

访问：`https://your-app.run.claw.cloud/health`

应返回：
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

## 完整文档

详见：[DEPLOY_CLAW_CLOUD.md](./DEPLOY_CLAW_CLOUD.md)
