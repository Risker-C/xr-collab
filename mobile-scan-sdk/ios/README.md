# iOS Device Capability Detection SDK

Week 1 任务交付：iOS设备能力检测库Demo

## 项目概述

这是一个用于检测iOS设备AR能力的SDK Demo，可以识别设备的LiDAR支持、ARKit版本、性能指标，并返回设备Tier分级。

## 功能特性

- ✅ LiDAR传感器检测（iPhone 12 Pro及以上）
- ✅ ARKit版本和功能支持检测
- ✅ 设备性能等级检测（CPU/GPU/RAM）
- ✅ 设备Tier分级（1/2/3）
- ✅ JSON格式输出

## 项目结构

```
ios/
├── DeviceCapabilityDemo.xcodeproj/    # Xcode项目文件
├── DeviceCapabilityDemo/
│   ├── DeviceCapabilityDemoApp.swift  # App入口
│   ├── ContentView.swift              # SwiftUI界面
│   ├── DeviceCapabilityDetector.swift # 核心检测逻辑
│   └── Info.plist                     # 配置文件
├── example-outputs/                   # 示例输出
│   ├── iphone-14-pro.json            # Tier 3设备
│   ├── iphone-13.json                # Tier 2设备
│   └── iphone-11.json                # Tier 1设备
├── TEST_REPORT.md                     # 测试报告
└── README.md                          # 本文件
```

## 技术栈

- **语言**: Swift 5.0+
- **框架**: SwiftUI, ARKit, Metal
- **最低支持**: iOS 15.0+
- **开发工具**: Xcode 15.0+

## 快速开始

### 1. 打开项目

```bash
open DeviceCapabilityDemo.xcodeproj
```

### 2. 运行Demo

1. 选择真机设备（模拟器不支持ARKit完整功能）
2. 点击运行按钮或按 `Cmd + R`
3. 在App中点击"Detect Device"按钮

### 3. 查看结果

App会显示：
- 设备型号
- Tier等级
- LiDAR支持状态
- ARKit版本
- 性能指标
- 完整JSON输出

## Tier分级说明

### Tier 3 - 高端设备
- **要求**: LiDAR + 6GB+ RAM + 6核CPU
- **设备**: iPhone 12 Pro+, iPhone 13 Pro+, iPhone 14 Pro+, iPhone 15 Pro+
- **能力**: 完整AR功能，场景重建，高精度深度感知

### Tier 2 - 中端设备
- **要求**: 人物遮挡 + 4GB+ RAM
- **设备**: iPhone 12, iPhone 13, iPhone 14, iPhone XS+
- **能力**: 高级AR功能，无LiDAR场景重建

### Tier 1 - 入门设备
- **要求**: 基础ARKit支持
- **设备**: iPhone X, iPhone 11, 更早机型
- **能力**: 基础世界追踪，有限高级功能

## API使用

### 检测设备能力

```swift
let capability = DeviceCapabilityDetector.detect()

print("Device: \(capability.deviceModel)")
print("Tier: \(capability.tier)")
print("LiDAR: \(capability.hasLiDAR)")
```

### 导出JSON

```swift
let json = DeviceCapabilityDetector.toJSON(capability)
print(json)
```

### 数据结构

```swift
struct DeviceCapability {
    let deviceModel: String        // 设备型号
    let hasLiDAR: Bool            // LiDAR支持
    let arKitVersion: String      // ARKit版本
    let arFeatures: ARFeatures    // AR功能列表
    let performance: PerformanceMetrics  // 性能指标
    let tier: Int                 // Tier等级 (1/2/3)
    let timestamp: String         // 检测时间
}
```

## 测试结果

已在以下设备上测试通过：
- ✅ iPhone 14 Pro (Tier 3)
- ✅ iPhone 13 (Tier 2)
- ✅ iPhone 11 (Tier 1)

详细测试报告见 [TEST_REPORT.md](TEST_REPORT.md)

## 示例输出

查看 `example-outputs/` 目录获取不同设备的JSON输出示例。

**iPhone 14 Pro (Tier 3)**:
```json
{
  "deviceModel": "iPhone15,2",
  "hasLiDAR": true,
  "tier": 3,
  "arKitVersion": "6.0",
  "performance": {
    "cpuCores": 6,
    "totalRAM": 6.0,
    "gpuFamily": "Apple9+"
  }
}
```

## 权限要求

- **相机权限**: 用于ARKit功能检测
- 已在 `Info.plist` 中配置 `NSCameraUsageDescription`

## 注意事项

1. 必须在真机上运行，模拟器不支持完整ARKit功能
2. 首次运行需要授予相机权限
3. LiDAR检测需要iOS 14.0+
4. GPU家族检测需要iOS 14.0+以获得准确结果

## 后续优化建议

- [ ] 添加网络能力检测（用于云端AR）
- [ ] 添加电池健康度检测
- [ ] 添加热状态监控（长时间AR会话）
- [ ] 支持更多设备型号识别
- [ ] 添加单元测试

## 许可证

MIT License

## 联系方式

项目开发：iOS工程师
日期：2026-02-22
