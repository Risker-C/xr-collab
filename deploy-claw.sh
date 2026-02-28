#!/bin/bash
set -e

echo "🚀 准备部署到 run.claw.cloud..."

# 检查配置文件
if [ ! -f "claw.json" ]; then
  echo "❌ claw.json 配置文件不存在"
  exit 1
fi

if [ ! -f "Dockerfile" ]; then
  echo "❌ Dockerfile 不存在"
  exit 1
fi

# 提交代码
echo "📝 提交代码到Git..."
git add -A
git commit -m "deploy: 准备部署到run.claw.cloud" || echo "没有新的改动"
git push origin main

echo "✅ 代码已推送到GitHub"
echo ""
echo "📋 下一步操作："
echo "1. 访问 https://run.claw.cloud/"
echo "2. 点击 'New Service' 或 '创建服务'"
echo "3. 选择 'From Git Repository'"
echo "4. 输入仓库: https://github.com/Risker-C/xr-collab.git"
echo "5. 配置环境变量（参考 DEPLOY_CLAW_CLOUD.md）"
echo "6. 点击 'Deploy' 开始部署"
echo ""
echo "📄 详细文档: ./DEPLOY_CLAW_CLOUD.md"
