# Android Camera Module

Android原生相机模块，集成CameraX和ARCore，提供Flutter桥接。

## 功能

- **CameraX相机管理** - 拍照、视频预览、帧回调
- **ARCore集成** - 深度API、场景理解、平面检测
- **Flutter桥接** - Method Channel完整桥接

## 文件结构

```
android-camera/
├── CameraManager.kt       # CameraX相机管理
├── ARCoreManager.kt       # ARCore集成
├── FlutterBridge.kt       # Flutter Method Channel桥接
└── README.md              # 本文件
```

## Flutter集成

### 1. 添加依赖

```yaml
# pubspec.yaml
dependencies:
  camera: ^0.10.0
```

### 2. 使用示例

```dart
import 'package:flutter/services.dart';

class CameraService {
  static const platform = MethodChannel('xr_collab/camera');
  static const eventChannel = EventChannel('xr_collab/camera/events');
  
  // 初始化相机
  Future<void> initCamera() async {
    await platform.invokeMethod('initCamera');
  }
  
  // 拍照
  Future<void> capturePhoto() async {
    await platform.invokeMethod('capturePhoto');
  }
  
  // 检查ARCore支持
  Future<bool> supportsARCore() async {
    return await platform.invokeMethod('supportsARCore');
  }
  
  // 检查深度API支持
  Future<bool> supportsDepth() async {
    return await platform.invokeMethod('supportsDepth');
  }
  
  // 监听事件
  void listenEvents() {
    eventChannel.receiveBroadcastStream().listen((event) {
      if (event['type'] == 'photoCapture') {
        print('Photo saved: ${event['path']}');
      }
    });
  }
}
```

## 权限配置

### AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.ar" android:required="false" />
```

## 依赖

### build.gradle

```gradle
dependencies {
    // CameraX
    implementation "androidx.camera:camera-core:1.3.0"
    implementation "androidx.camera:camera-camera2:1.3.0"
    implementation "androidx.camera:camera-lifecycle:1.3.0"
    
    // ARCore
    implementation "com.google.ar:core:1.40.0"
}
```

## API文档

### Methods

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| initCamera | - | bool | 初始化相机 |
| capturePhoto | - | bool | 拍照 |
| supportsARCore | - | bool | 检查ARCore支持 |
| supportsDepth | - | bool | 检查深度API支持 |
| getCameraInfo | - | Map | 获取相机信息 |
| getARCoreInfo | - | Map | 获取ARCore信息 |
| release | - | void | 释放资源 |

### Events

| 事件 | 数据 | 说明 |
|------|------|------|
| photoCapture | {type, path} | 拍照完成 |
| error | {code, message} | 错误事件 |

## 状态

✅ **Week 4完成** - 核心功能已实现，可直接集成到Flutter项目。
