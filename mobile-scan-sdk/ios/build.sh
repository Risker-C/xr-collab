#!/bin/bash

# iOS Device Capability Demo - Build Script
# 用于在macOS上构建项目

set -e

echo "🔨 Building iOS Device Capability Demo..."

# 检查是否在macOS上
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS with Xcode installed"
    exit 1
fi

# 检查Xcode是否安装
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_NAME="DeviceCapabilityDemo"
SCHEME="DeviceCapabilityDemo"

cd "$PROJECT_DIR"

echo "📦 Cleaning build folder..."
xcodebuild clean -project "${PROJECT_NAME}.xcodeproj" -scheme "$SCHEME" > /dev/null 2>&1

echo "🏗️  Building for iOS device..."
xcodebuild build \
    -project "${PROJECT_NAME}.xcodeproj" \
    -scheme "$SCHEME" \
    -destination 'generic/platform=iOS' \
    -configuration Debug \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO

echo "✅ Build completed successfully!"
echo ""
echo "📱 To run on device:"
echo "   1. Open ${PROJECT_NAME}.xcodeproj in Xcode"
echo "   2. Connect your iPhone"
echo "   3. Select your device from the device menu"
echo "   4. Click Run (⌘R)"
echo ""
echo "📄 Check example-outputs/ for sample JSON results"
echo "📋 Read TEST_REPORT.md for detailed test results"
