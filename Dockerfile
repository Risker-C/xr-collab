FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY backend ./backend
COPY frontend ./frontend

EXPOSE 3001

CMD ["node", "backend/server.js"]
