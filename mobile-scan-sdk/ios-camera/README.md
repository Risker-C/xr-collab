# iOS Camera Module

iOS原生相机模块，集成AVFoundation和ARKit，提供Flutter桥接。

## 功能

- **CameraManager**: AVFoundation相机管理（拍照、视频预览）
- **ARKitManager**: ARKit集成（LiDAR检测、场景重建）
- **FlutterBridge**: Flutter Method Channel桥接
- **CameraPreviewView**: SwiftUI原生预览界面

## 技术栈

- Swift 5.9+
- AVFoundation
- ARKit 6.0
- SwiftUI
- Flutter Method Channel

## Flutter集成

```dart
// 初始化相机
await platform.invokeMethod('initCamera');
await platform.invokeMethod('startCamera');

// 拍照
await platform.invokeMethod('capturePhoto');

// 初始化AR
await platform.invokeMethod('initAR');
await platform.invokeMethod('startAR');

// 检测LiDAR
bool hasLiDAR = await platform.invokeMethod('hasLiDAR');

// 捕获场景
await platform.invokeMethod('captureWorldMap');
```

## 权限配置

在 `Info.plist` 添加：

```xml
<key>NSCameraUsageDescription</key>
<string>需要访问相机进行3D扫描</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>需要保存扫描照片</string>
```

## 测试

```bash
swift test
```
