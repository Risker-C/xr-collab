# WebXR 设备兼容性清单

## 概述

本文档整理了 WebXR Device API 和降级方案（DeviceOrientation API）在主流浏览器和设备上的兼容性情况。

---

## 1. WebXR Device API 兼容性

### 1.1 移动端浏览器

| 浏览器 | 平台 | WebXR 支持 | AR 模式 | VR 模式 | 最低版本 | 备注 |
|--------|------|-----------|---------|---------|----------|------|
| **Chrome** | Android | ✅ 完全支持 | ✅ 支持 | ✅ 支持 | Chrome 79+ | 需要 ARCore 支持（AR模式） |
| **Edge** | Android | ✅ 完全支持 | ✅ 支持 | ✅ 支持 | Edge 79+ | 基于 Chromium，与 Chrome 一致 |
| **Samsung Internet** | Android | ✅ 支持 | ✅ 支持 | ✅ 支持 | v15.0+ | 基于 Chromium |
| **Safari** | iOS | ⚠️ 部分支持 | ⚠️ 有限 | ❌ 不支持 | iOS 15.2+ | 功能受限，需要用户手势触发 |
| **Firefox** | Android | ⚠️ 实验性 | ❌ 不支持 | ⚠️ 实验性 | - | 需要手动启用 flag |
| **微信内置浏览器** | Android/iOS | ❌ 不支持 | ❌ 不支持 | ❌ 不支持 | - | 建议引导用户在外部浏览器打开 |

### 1.2 桌面浏览器

| 浏览器 | 平台 | WebXR 支持 | VR 模式 | 备注 |
|--------|------|-----------|---------|------|
| **Chrome** | Windows/macOS/Linux | ✅ 支持 | ✅ 支持 | 需要 VR 头显设备 |
| **Edge** | Windows | ✅ 支持 | ✅ 支持 | 原生支持 Windows Mixed Reality |
| **Firefox** | Windows/Linux | ⚠️ 实验性 | ⚠️ 实验性 | 需要启用 flag |
| **Safari** | macOS | ❌ 不支持 | ❌ 不支持 | - |

### 1.3 VR/AR 专用设备

| 设备 | 浏览器 | WebXR 支持 | AR 模式 | VR 模式 | 备注 |
|------|--------|-----------|---------|---------|------|
| **Meta Quest 2/3/Pro** | Quest Browser | ✅ 原生支持 | ✅ 支持 | ✅ 支持 | 最佳体验 |
| **Pico** | Pico Browser | ✅ 支持 | ✅ 支持 | ✅ 支持 | 基于 Chromium |
| **HoloLens 2** | Edge | ✅ 支持 | ✅ 支持 | ❌ 不支持 | AR 专用设备 |
| **Magic Leap** | Helio Browser | ✅ 支持 | ✅ 支持 | ❌ 不支持 | AR 专用设备 |

---

## 2. DeviceOrientation API 兼容性（降级方案）

### 2.1 移动端浏览器

| 浏览器 | 平台 | DeviceOrientation | DeviceMotion | 权限请求 | 备注 |
|--------|------|-------------------|--------------|----------|------|
| **Chrome** | Android | ✅ 支持 | ✅ 支持 | ❌ 无需 | 自动可用 |
| **Edge** | Android | ✅ 支持 | ✅ 支持 | ❌ 无需 | 自动可用 |
| **Safari** | iOS | ✅ 支持 | ✅ 支持 | ✅ **需要** | iOS 13+ 需要用户授权 |
| **Firefox** | Android | ✅ 支持 | ✅ 支持 | ❌ 无需 | 自动可用 |
| **Samsung Internet** | Android | ✅ 支持 | ✅ 支持 | ❌ 无需 | 自动可用 |
| **微信内置浏览器** | Android | ✅ 支持 | ✅ 支持 | ❌ 无需 | 可作为降级方案 |
| **微信内置浏览器** | iOS | ✅ 支持 | ✅ 支持 | ⚠️ 可能需要 | 行为不一致 |

### 2.2 桌面浏览器

桌面设备通常不具备陀螺仪传感器，DeviceOrientation API 不适用。

---

## 3. 关键兼容性问题

### 3.1 iOS Safari 限制

**问题描述：**
- iOS 13+ 需要用户主动授权才能访问陀螺仪数据
- WebXR 支持有限（iOS 15.2+），部分功能不可用
- 必须在用户手势（如点击）触发的事件中请求权限

**解决方案：**
```javascript
// 必须在用户交互事件中调用
button.addEventListener('click', async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
            // 开始监听陀螺仪数据
        }
    }
});
```

### 3.2 微信内置浏览器

**问题描述：**
- 不支持 WebXR API
- DeviceOrientation API 可用，但行为可能不一致
- 部分功能受限（如全屏、指针锁定等）

**解决方案：**
- 检测微信浏览器环境
- 引导用户在外部浏览器打开
- 或使用 DeviceOrientation 降级方案

```javascript
function isWeChatBrowser() {
    return /MicroMessenger/i.test(navigator.userAgent);
}

if (isWeChatBrowser()) {
    // 显示提示：建议在外部浏览器打开
}
```

### 3.3 ARCore 依赖（Android）

**问题描述：**
- Android 设备的 AR 功能需要 Google ARCore 支持
- 部分低端设备不支持 ARCore
- 用户可能未安装 ARCore 服务

**解决方案：**
- 检测 AR 模式是否可用
- 提供降级到非 AR 模式的选项
- 引导用户安装 ARCore（如需要）

---

## 4. 推荐配置

### 4.1 最佳体验设备

1. **Meta Quest 2/3/Pro** - 原生 WebXR 支持，最佳 VR 体验
2. **Android 旗舰手机 + Chrome** - 完整 WebXR AR 支持
3. **iPhone 13+ (iOS 15.2+) + Safari** - 有限 WebXR 支持

### 4.2 降级方案适用设备

1. **iPhone (iOS 13+) + Safari** - DeviceOrientation API
2. **Android 中低端设备** - DeviceOrientation API
3. **微信内置浏览器** - DeviceOrientation API

### 4.3 不推荐设备

1. **桌面浏览器（无 VR 设备）** - 缺少空间追踪能力
2. **iOS 13 以下版本** - 无陀螺仪权限 API
3. **旧版 Android 浏览器** - 可能缺少必要 API

---

## 5. 兼容性检测代码

### 5.1 WebXR 检测

```javascript
async function checkWebXRSupport() {
    if (!('xr' in navigator)) {
        return { supported: false };
    }

    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');

    return {
        supported: true,
        ar: arSupported,
        vr: vrSupported
    };
}
```

### 5.2 DeviceOrientation 检测

```javascript
function checkOrientationSupport() {
    const hasOrientation = 'DeviceOrientationEvent' in window;
    const hasMotion = 'DeviceMotionEvent' in window;
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' && 
                           typeof DeviceOrientationEvent.requestPermission === 'function';

    return {
        supported: hasOrientation,
        motion: hasMotion,
        needsPermission: needsPermission
    };
}
```

---

## 6. 测试建议

### 6.1 必测设备组合

1. **Android + Chrome** (最新版)
2. **iPhone + Safari** (iOS 15.2+)
3. **Meta Quest 2/3** (Quest Browser)
4. **微信内置浏览器** (Android/iOS)

### 6.2 测试要点

- [ ] WebXR API 可用性
- [ ] AR/VR 模式启动
- [ ] 陀螺仪权限请求（iOS）
- [ ] DeviceOrientation 数据准确性
- [ ] 降级方案自动切换
- [ ] 性能表现（帧率、延迟）
- [ ] 全屏模式兼容性

---

## 7. 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-02-22 | v1.0 | 初始版本，整理主流设备兼容性 |

---

## 8. 参考资源

- [WebXR Device API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Can I Use - WebXR](https://caniuse.com/webxr)
- [DeviceOrientation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)
- [ARCore Supported Devices](https://developers.google.com/ar/devices)
