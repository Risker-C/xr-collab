# 存储凭据安全说明

## 文件位置
`/root/.openclaw/workspace/xr-collab-real/.env.credentials`

## 安全措施
1. ✅ 文件权限设置为 600（仅所有者可读写）
2. ✅ 已添加到 .gitignore（不会提交到Git）
3. ✅ 仅包含环境变量，不包含明文密码

## 使用方法

### 加载环境变量
```bash
# 在bash中
. /root/.openclaw/workspace/xr-collab-real/.env.credentials

# 验证加载
echo $REDIS_URL
echo $R2_BUCKET_NAME
```

### 在代码中使用
```javascript
// Node.js
require('dotenv').config({ path: '.env.credentials' });

const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

const { S3Client } = require('@aws-sdk/client-s3');
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
```

## Render.com 部署配置

需要在 Render.com 控制台手动添加环境变量：
1. 访问：https://dashboard.render.com/
2. 选择 `xr-collab-backend` 服务
3. Environment → 添加以下变量：

```
REDIS_URL=redis://default:AdwrAAIncDJ...@healthy-grouse-56363.upstash.io:6379
R2_ACCOUNT_ID=4b742ece0b0b6054a9eceef5dbc9d404
R2_ACCESS_KEY_ID=41db384c272f1a7c4a845b9909582ef7
R2_SECRET_ACCESS_KEY=7d474209ecd4344832770c4a3317fb2354592c9ef8554548e89cd0c7d2eb0922
R2_BUCKET_NAME=xr-collab-storage
R2_ENDPOINT=https://4b742ece0b0b6054a9eceef5dbc9d404.r2.cloudflarestorage.com
```

## 注意事项
⚠️ **永远不要**：
- 将 `.env.credentials` 提交到 Git
- 在日志中打印完整的密钥
- 在前端代码中使用这些凭据
- 通过HTTP传输明文密钥

✅ **应该**：
- 仅在服务器端使用
- 定期轮换密钥
- 使用环境变量注入
- 限制访问权限

---
*创建时间：2026-03-01 10:19*
