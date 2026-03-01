#!/bin/bash
# Apple ML-Sharp 安装脚本
# 用于在Render.com或本地环境安装Apple ML-Sharp

set -e

echo "🚀 开始安装Apple ML-Sharp..."

# 检查Python版本
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
echo "📋 当前Python版本: $PYTHON_VERSION"

# 克隆Apple ML-Sharp仓库
if [ ! -d "/tmp/ml-sharp-repo" ]; then
  echo "📦 克隆Apple ML-Sharp仓库..."
  git clone https://github.com/apple/ml-sharp.git /tmp/ml-sharp-repo
fi

cd /tmp/ml-sharp-repo

# 安装依赖
echo "📦 安装依赖..."
pip3 install -r requirements.txt

# 验证安装
echo "✅ 验证安装..."
if sharp --help > /dev/null 2>&1; then
  echo "✅ Apple ML-Sharp安装成功！"
  sharp --help
else
  echo "❌ Apple ML-Sharp安装失败"
  exit 1
fi

# 下载模型
echo "📥 下载模型checkpoint..."
mkdir -p ~/.cache/torch/hub/checkpoints/
wget -O ~/.cache/torch/hub/checkpoints/sharp_2572gikvuh.pt \
  https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt || true

echo "🎉 Apple ML-Sharp安装完成！"
echo ""
echo "📝 使用方法："
echo "  sharp predict -i /path/to/input/images -o /path/to/output/gaussians"
echo ""
echo "🔗 更多信息："
echo "  GitHub: https://github.com/apple/ml-sharp"
echo "  论文: https://arxiv.org/abs/2512.10685"
