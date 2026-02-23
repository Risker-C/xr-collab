# XR Collab 建筑扫描功能文档 / Scanning Documentation

## 📚 文档导航 / Documentation Navigation

### 🎯 用户手册 / User Guide
- [中文用户手册](./user-guide/zh/README.md) - 如何使用扫描功能
- [English User Guide](./user-guide/en/README.md) - How to use scanning features

### 💻 开发文档 / Developer Documentation
- [中文开发文档](./developer/zh/README.md) - API接口、代码结构
- [English Developer Docs](./developer/en/README.md) - API interfaces, code structure

### 🚀 部署文档 / Deployment Guide
- [中文部署指南](./deployment/zh/README.md) - 环境要求、配置说明
- [English Deployment Guide](./deployment/en/README.md) - Environment requirements, configuration

### 🔧 故障排查 / Troubleshooting
- [中文故障排查手册](./troubleshooting/zh/README.md) - 常见问题FAQ
- [English Troubleshooting Guide](./troubleshooting/en/README.md) - Common issues FAQ

### ⭐ 最佳实践 / Best Practices
- [中文最佳实践指南](./best-practices/zh/README.md) - 扫描技巧、优化建议
- [English Best Practices Guide](./best-practices/en/README.md) - Scanning tips, optimization

---

## 🏗️ 架构概览 / Architecture Overview

详细架构设计请参考：[XR扫描架构文档](../XR_SCAN_ARCHITECTURE.md)

### 核心模块 / Core Modules
1. **扫描数据采集层** - WebXR + ARKit/ARCore
2. **点云处理层** - SfM/MVS重建与优化
3. **渲染引擎集成** - Three.js场景管理
4. **网络同步层** - WebSocket实时协作
5. **性能优化层** - LOD与内存管理

---

## 🚀 快速开始 / Quick Start

### Web端扫描 / Web Scanning
```javascript
// 创建扫描会话
const session = await scanAPI.createSession({
  roomId: 'room123',
  captureMode: 'photogrammetry'
});

// 开始采集
await session.startCapture();
```

### 移动端扫描 / Mobile Scanning
```swift
// iOS ARKit
let scanner = ARScanner()
scanner.startSession(config: .highQuality)
```

详细教程请查看用户手册。

---

## 📦 项目结构 / Project Structure

```
docs/scanning/
├── README.md                    # 本文件
├── user-guide/                  # 用户手册
│   ├── zh/                      # 中文
│   └── en/                      # English
├── developer/                   # 开发文档
│   ├── zh/
│   └── en/
├── deployment/                  # 部署文档
│   ├── zh/
│   └── en/
├── troubleshooting/            # 故障排查
│   ├── zh/
│   └── en/
└── best-practices/             # 最佳实践
    ├── zh/
    └── en/
```

---

## 🤝 贡献指南 / Contributing

欢迎提交文档改进建议！请遵循以下规范：
- 中英文文档保持同步
- 代码示例需可运行
- 截图使用高清图片
- 遵循Markdown格式规范

---

## 📄 许可证 / License

MIT License - 详见项目根目录LICENSE文件
