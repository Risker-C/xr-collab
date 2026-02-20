# XR Collab - 快速开始指南

## 🚀 5分钟快速启动

### 方式一：Docker Compose（推荐）

最简单的方式，一键启动所有服务：

```bash
# 1. 克隆项目
git clone https://github.com/Risker-C/xr-collab.git
cd xr-collab

# 2. 启动所有服务（后端 + Redis + 前端）
docker-compose up

# 3. 打开浏览器
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

**就这么简单！** 🎉

---

### 方式二：本地开发

如果你想修改代码：

#### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 启动Redis（如果没有Docker）
# macOS: brew install redis && redis-server
# Ubuntu: sudo apt install redis-server && redis-server
# Windows: 下载Redis for Windows
```

#### 2. 配置环境变量

```bash
cd backend
cp .env.example .env

# 编辑.env文件，设置：
# JWT_SECRET=your-secret-key-here
# REDIS_URL=redis://localhost:6379
# RAILWAY_WORKER_URL=https://lightweight-distributed-ai-production.up.railway.app
# KOYEB_WORKER_URL=https://naughty-carina-risker666-8ce36d54.koyeb.app
```

#### 3. 启动后端

```bash
cd backend
node server.js

# 看到这个说明成功：
# ✓ Server running on http://localhost:3001
# ✓ Redis connected
# ✓ Workers: Railway ✓ Koyeb ✓
```

#### 4. 启动前端

```bash
# 方式A: 使用Python
cd frontend
python3 -m http.server 3000

# 方式B: 使用Node.js
npx serve -p 3000

# 方式C: 使用任何静态服务器
```

#### 5. 打开浏览器

访问 http://localhost:3000

---

## 📱 如何使用

### 基础使用

1. **输入用户名和房间ID**
   - 用户名：随便起一个（例如：Alice）
   - 房间ID：和朋友约定一个（例如：room123）

2. **点击"Join Room"**
   - 你会看到3D场景
   - 左侧显示在线用户列表

3. **移动和交互**
   - 鼠标拖拽：旋转视角
   - WASD键：移动（如果实现了）
   - 点击"Create Cube"：创建一个方块

4. **多人协作**
   - 让朋友也打开网页
   - 输入相同的房间ID
   - 你们会看到彼此的Avatar（头部+身体）
   - 实时同步位置和创建的对象

### VR/AR设备使用

如果你有VR头显（Quest、Vive等）：

1. 在VR浏览器中打开 http://your-server-ip:3000
2. 点击右下角的VR图标进入VR模式
3. 使用VR控制器：
   - 扳机键：选择和抓取对象
   - 握把键：传送移动
   - 看到射线指向的位置

---

## 🧪 测试Worker计算

项目集成了分布式Python workers，可以执行复杂计算：

### 测试碰撞检测

```bash
curl -X POST http://localhost:3001/api/worker/compute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "collision",
    "data": {
      "sphere1": {"pos": [0,0,0], "radius": 1.0},
      "sphere2": {"pos": [1.5,0,0], "radius": 1.0}
    }
  }'
```

### 测试边界框计算

```bash
curl -X POST http://localhost:3001/api/worker/compute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bbox",
    "data": {
      "points": [[0,0,0], [1,2,3], [-1,1,2], [2,-1,1]]
    }
  }'
```

结果会实时显示在前端UI的"Worker Results"面板中。

---

## 🔧 常见问题

### Q: 看不到其他用户？
A: 确保：
- 使用相同的房间ID
- 后端服务正在运行
- 浏览器控制台没有错误

### Q: Redis连接失败？
A: 
- 检查Redis是否运行：`redis-cli ping`（应返回PONG）
- 或者不用Redis，系统会自动降级到内存模式

### Q: Worker不工作？
A: 
- Workers是可选的，不影响基础功能
- 检查后端日志看Worker健康检查状态
- 可以在.env中禁用Workers

### Q: VR模式无法进入？
A: 
- 需要HTTPS（本地开发可以用localhost）
- 确保浏览器支持WebXR
- 检查VR设备是否连接

---

## 📚 进阶使用

### 自定义Avatar

编辑 `frontend/app.js` 中的 `createAvatar()` 函数：

```javascript
function createAvatar(user) {
    // 修改颜色
    const color = user.color || 0xff0000; // 红色
    
    // 修改大小
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16); // 更大的头
    
    // 添加更多细节...
}
```

### 添加新的Worker计算

在 `backend/worker-bridge.js` 中添加新的计算类型：

```javascript
async function submitTask(type, data) {
    if (type === 'my-custom-calc') {
        const code = `
import math
# 你的Python代码
result = ...
print(result)
        `;
        return await this.executeCode(code);
    }
}
```

### 部署到生产环境

```bash
# 1. 构建Docker镜像
docker build -t xr-collab .

# 2. 推送到容器仓库
docker tag xr-collab your-registry/xr-collab
docker push your-registry/xr-collab

# 3. 部署到Kubernetes/云平台
kubectl apply -f k8s-deployment.yaml
```

---

## 🎯 下一步

- [ ] 添加语音聊天
- [ ] 实现手势识别
- [ ] 添加更多3D模型
- [ ] 优化性能（LOD、实例化）
- [ ] 添加持久化存储（保存场景）

---

## 💡 技术栈

- **前端**: Three.js + WebXR API
- **后端**: Node.js + Socket.IO + Express
- **存储**: Redis (可选)
- **Workers**: Python (Railway + Koyeb)
- **容器**: Docker + Docker Compose

---

## 📞 需要帮助？

- GitHub Issues: https://github.com/Risker-C/xr-collab/issues
- 查看完整文档: [README.md](README.md)
- 查看项目总结: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

**享受你的XR协作体验！** 🎉🥽✨
