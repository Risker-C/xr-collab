# XR Collab - 使用指南

## 🎯 项目已上线

**GitHub**: https://github.com/Risker-C/xr-collab  
**快速开始**: 查看 [QUICKSTART.md](https://github.com/Risker-C/xr-collab/blob/main/QUICKSTART.md)

---

## ⚡ 最快启动方式

```bash
# 1. 克隆项目
git clone https://github.com/Risker-C/xr-collab.git
cd xr-collab

# 2. 一键启动（Docker）
docker-compose up

# 3. 打开浏览器
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

---

## 🎮 基本使用流程

### 第一步：加入房间
1. 打开 http://localhost:3000
2. 输入用户名（例如：Alice）
3. 输入房间ID（例如：demo）
4. 点击"Join Room"

### 第二步：创建对象
- 点击"Create Cube"创建方块
- 点击"Create Sphere"创建球体
- 所有房间内的用户都会看到

### 第三步：邀请朋友
1. 让朋友打开相同网址
2. 输入相同的房间ID
3. 你们会看到彼此的Avatar（有头和身体的角色）
4. 实时同步移动和对象创建

### 第四步：测试Worker计算
- 点击"Geometry Calc"测试几何计算
- 点击"Collision Test"测试碰撞检测
- 结果会显示在右下角面板

---

## 🥽 VR/AR 使用

### 支持的设备
- Meta Quest 2/3/Pro
- HTC Vive
- Valve Index
- 任何支持WebXR的设备

### 如何进入VR模式
1. 在VR浏览器中打开网页
2. 点击右下角的VR图标
3. 使用控制器：
   - **扳机键**：选择/抓取对象
   - **握把键**：传送移动
   - **摇杆**：旋转视角

---

## 📊 当前运行状态

Master，您的服务器现在正在运行：

### 后端服务
- ✅ **端口**: 3001
- ✅ **状态**: 运行中
- ⚠️ **Redis**: 未连接（降级为内存模式）
- ✅ **Workers**: Railway + Koyeb 集成

### 前端服务
- ✅ **端口**: 3000
- ✅ **状态**: 运行中
- ✅ **访问**: http://localhost:3000

### Workers状态
- ✅ **Railway**: https://lightweight-distributed-ai-production.up.railway.app
- ✅ **Koyeb**: https://naughty-carina-risker666-8ce36d54.koyeb.app

---

## 🔧 常用命令

### 查看日志
```bash
# 后端日志
tail -f backend/logs/app.log

# Docker日志
docker-compose logs -f
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 只重启后端
docker-compose restart backend
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 或手动停止进程
pkill -f "node backend/server.js"
pkill -f "python3 -m http.server"
```

---

## 🎨 自定义和扩展

### 修改Avatar外观
编辑 `frontend/app.js` 的 `createAvatar()` 函数

### 添加新的3D对象
在 `frontend/app.js` 中添加新的创建函数，参考 `createCube()` 和 `createSphere()`

### 添加Worker计算任务
编辑 `backend/worker-bridge.js`，添加新的计算类型

### 修改场景配置
编辑 `frontend/scene-config.json`

---

## 📱 移动端使用

- iOS: 使用Safari浏览器
- Android: 使用Chrome浏览器
- 支持陀螺仪控制视角
- 触摸屏幕创建对象

---

## 🚀 生产部署

### 使用Docker
```bash
docker build -t xr-collab .
docker run -p 3001:3001 -e JWT_SECRET=your-secret xr-collab
```

### 使用Kubernetes
```bash
kubectl apply -f k8s/
```

### 环境变量
- `PORT`: 服务器端口（默认3001）
- `JWT_SECRET`: JWT密钥
- `REDIS_URL`: Redis连接地址
- `RAILWAY_WORKER_URL`: Railway worker地址
- `KOYEB_WORKER_URL`: Koyeb worker地址

---

## 💡 下一步建议

1. **添加Redis**: `docker run -d -p 6379:6379 redis` 启用持久化
2. **配置HTTPS**: 使用nginx反向代理，VR模式需要HTTPS
3. **性能优化**: 添加对象池、LOD、场景剔除
4. **更多功能**: 语音聊天、文件上传、场景保存

---

## 📞 获取帮助

- **文档**: [README.md](https://github.com/Risker-C/xr-collab)
- **快速开始**: [QUICKSTART.md](https://github.com/Risker-C/xr-collab/blob/main/QUICKSTART.md)
- **项目总结**: [PROJECT_SUMMARY.md](https://github.com/Risker-C/xr-collab/blob/main/PROJECT_SUMMARY.md)

---

**开始你的XR协作之旅吧！** 🎉

Master，服务器已在本机运行。您可以：
1. 在浏览器中访问 http://localhost:3000 体验
2. 分享给朋友一起测试多人协作
3. 部署到公网服务器供更多人使用

需要我做其他的吗？🍉
