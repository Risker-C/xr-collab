FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用代码
COPY backend ./backend
COPY frontend ./frontend

# 创建存储目录
RUN mkdir -p /app/storage/uploads /app/storage/models /app/storage/scans && \
    chown -R node:node /app/storage

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "backend/server.js"]
