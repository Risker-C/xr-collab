# WebXR 降级策略文档

## 1. 概述

当设备不支持 WebXR Device API 时，系统需要提供降级方案以保证基本功能可用。本文档定义了完整的降级策略，包括技术方案、实现细节和用户体验设计。

---

## 2. 降级层级设计

### 2.1 三级降级策略

```
Level 1: WebXR Device API (最佳体验)
    ↓ 不支持
Level 2: DeviceOrientation API (降级方案)
    ↓ 不支持/无权限
Level 3: 鼠标/触摸拖拽 (最小可用)
```

### 2.2 降级判断流程

```javascript
async function determineTrackingMode() {
    // Level 1: 检查 WebXR
    if ('xr' in navigator) {
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
        
        if (arSupported || vrSupported) {
            return { mode: 'webxr', level: 1, capabilities: { ar: arSupported, vr: vrSupported } };
        }
    }

    // Level 2: 检查 DeviceOrientation
    if ('DeviceOrientationEvent' in window) {
        // iOS 13+ 需要权限
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            return { mode: 'orientation-pending', level: 2, needsPermission: true };
        }
        return { mode: 'orientation', level: 2, needsPermission: false };
    }

    // Level 3: 纯手动控制
    return { mode: 'manual', level: 3 };
}
```

---

## 3. Level 2: DeviceOrientation API 降级方案

### 3.1 技术原理

DeviceOrientation API 提供设备的旋转姿态数据，可以模拟头部追踪效果。

**核心事件：**
- `deviceorientation` - 提供设备旋转角度（alpha, beta, gamma）
- `devicemotion` - 提供加速度和旋转速率

**坐标系映射：**
```
DeviceOrientation → Three.js Camera Rotation
- alpha (0-360°)   → Y轴旋转 (yaw)
- beta (-180-180°) → X轴旋转 (pitch)
- gamma (-90-90°)  → Z轴旋转 (roll)
```

### 3.2 实现代码

```javascript
class OrientationCamera {
    constructor(camera) {
        this.camera = camera;
        this.enabled = false;
        this.alphaOffset = 0;
    }

    async enable() {
        // iOS 需要请求权限
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission denied');
            }
        }

        this.enabled = true;
        window.addEventListener('deviceorientation', this.onOrientationChange.bind(this));
        
        // 记录初始方向作为偏移
        this.calibrate();
    }

    disable() {
        this.enabled = false;
        window.removeEventListener('deviceorientation', this.onOrientationChange.bind(this));
    }

    calibrate() {
        // 当前方向作为"正前方"
        this.alphaOffset = this.lastAlpha || 0;
    }

    onOrientationChange(event) {
        if (!this.enabled) return;

        const { alpha, beta, gamma } = event;
        
        // 保存原始值
        this.lastAlpha = alpha;
        this.lastBeta = beta;
        this.lastGamma = gamma;

        // 转换为弧度
        const alphaRad = THREE.MathUtils.degToRad(alpha - this.alphaOffset);
        const betaRad = THREE.MathUtils.degToRad(beta);
        const gammaRad = THREE.MathUtils.degToRad(gamma);

        // 应用到相机旋转
        // 注意：不同设备的坐标系可能有差异，需要测试调整
        this.camera.rotation.set(
            betaRad,
            alphaRad,
            -gammaRad,
            'YXZ' // 旋转顺序很重要
        );
    }
}
```

### 3.3 使用示例

```javascript
// 初始化
const orientationCamera = new OrientationCamera(camera);

// 用户点击按钮启动
startButton.addEventListener('click', async () => {
    try {
        await orientationCamera.enable();
        console.log('Orientation tracking enabled');
    } catch (error) {
        console.error('Failed to enable orientation:', error);
        // 降级到 Level 3
        enableManualControl();
    }
});

// 校准按钮（重置"正前方"）
calibrateButton.addEventListener('click', () => {
    orientationCamera.calibrate();
});
```

### 3.4 优化建议

**1. 平滑滤波**
```javascript
class SmoothedOrientation {
    constructor(smoothing = 0.8) {
        this.smoothing = smoothing;
        this.smoothedAlpha = 0;
        this.smoothedBeta = 0;
        this.smoothedGamma = 0;
    }

    update(alpha, beta, gamma) {
        this.smoothedAlpha = this.smoothing * this.smoothedAlpha + (1 - this.smoothing) * alpha;
        this.smoothedBeta = this.smoothing * this.smoothedBeta + (1 - this.smoothing) * beta;
        this.smoothedGamma = this.smoothing * this.smoothedGamma + (1 - this.smoothing) * gamma;
        
        return {
            alpha: this.smoothedAlpha,
            beta: this.smoothedBeta,
            gamma: this.smoothedGamma
        };
    }
}
```

**2. 限制旋转范围**
```javascript
// 限制俯仰角，避免"翻转"
const clampedBeta = THREE.MathUtils.clamp(beta, -85, 85);
```

**3. 防抖处理**
```javascript
// 小幅度变化不更新
const threshold = 0.5; // 度数
if (Math.abs(alpha - lastAlpha) < threshold) {
    return; // 跳过更新
}
```

---

## 4. Level 3: 手动控制降级方案

### 4.1 触摸/鼠标拖拽

```javascript
class ManualCamera {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isPointerDown = false;
        this.pointerStart = { x: 0, y: 0 };
        this.rotation = { x: 0, y: 0 };
        this.sensitivity = 0.002;

        this.bindEvents();
    }

    bindEvents() {
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    }

    onPointerDown(event) {
        this.isPointerDown = true;
        this.pointerStart.x = event.clientX;
        this.pointerStart.y = event.clientY;
    }

    onPointerMove(event) {
        if (!this.isPointerDown) return;

        const deltaX = event.clientX - this.pointerStart.x;
        const deltaY = event.clientY - this.pointerStart.y;

        this.rotation.y += deltaX * this.sensitivity;
        this.rotation.x += deltaY * this.sensitivity;

        // 限制俯仰角
        this.rotation.x = THREE.MathUtils.clamp(this.rotation.x, -Math.PI / 2, Math.PI / 2);

        this.camera.rotation.set(this.rotation.x, this.rotation.y, 0, 'YXZ');

        this.pointerStart.x = event.clientX;
        this.pointerStart.y = event.clientY;
    }

    onPointerUp() {
        this.isPointerDown = false;
    }
}
```

### 4.2 虚拟摇杆（移动端）

```javascript
// 屏幕左侧：移动控制
// 屏幕右侧：视角控制
class VirtualJoystick {
    constructor(container) {
        this.container = container;
        this.createJoysticks();
    }

    createJoysticks() {
        // 左摇杆：移动
        this.moveJoystick = this.createJoystick('left');
        // 右摇杆：视角
        this.lookJoystick = this.createJoystick('right');
    }

    createJoystick(side) {
        const joystick = document.createElement('div');
        joystick.className = `virtual-joystick ${side}`;
        joystick.style.position = 'fixed';
        joystick.style.bottom = '40px';
        joystick.style[side] = '40px';
        joystick.style.width = '100px';
        joystick.style.height = '100px';
        joystick.style.borderRadius = '50%';
        joystick.style.background = 'rgba(255,255,255,0.3)';
        
        this.container.appendChild(joystick);
        
        // 添加触摸事件处理...
        return joystick;
    }

    getInput() {
        return {
            move: { x: 0, y: 0 }, // -1 到 1
            look: { x: 0, y: 0 }  // -1 到 1
        };
    }
}
```

---

## 5. iOS 权限请求最佳实践

### 5.1 权限请求时机

**推荐：**
- 用户点击"开始体验"按钮时请求
- 在引导页明确说明需要陀螺仪权限
- 提供"为什么需要权限"的说明

**不推荐：**
- 页面加载时立即请求
- 没有任何说明直接请求

### 5.2 权限请求 UI 设计

```html
<div class="permission-prompt">
    <h2>需要访问陀螺仪</h2>
    <p>为了提供沉浸式体验，我们需要访问您的设备陀螺仪来追踪头部运动。</p>
    <button id="grant-permission">允许访问</button>
</div>
```

```javascript
document.getElementById('grant-permission').addEventListener('click', async () => {
    try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const response = await DeviceOrientationEvent.requestPermission();
            
            if (response === 'granted') {
                // 权限已授予，启动应用
                startApplication();
            } else {
                // 权限被拒绝
                showFallbackOptions();
            }
        } else {
            // 不需要权限（Android）
            startApplication();
        }
    } catch (error) {
        console.error('Permission request failed:', error);
        showError();
    }
});
```

### 5.3 权限被拒绝后的处理

```javascript
function showFallbackOptions() {
    const message = `
        <div class="fallback-message">
            <h3>无法使用陀螺仪</h3>
            <p>您可以选择以下方式继续：</p>
            <ul>
                <li>使用触摸拖拽控制视角</li>
                <li>重新授予权限（设置 > Safari > 本网站）</li>
            </ul>
            <button onclick="enableManualControl()">使用手动控制</button>
        </div>
    `;
    
    document.body.innerHTML = message;
}
```

---

## 6. 统一降级管理器

### 6.1 TrackingManager 设计

```javascript
class TrackingManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.currentMode = null;
        this.handlers = {
            webxr: null,
            orientation: null,
            manual: null
        };
    }

    async initialize() {
        const mode = await determineTrackingMode();
        
        switch (mode.mode) {
            case 'webxr':
                await this.enableWebXR(mode);
                break;
            case 'orientation-pending':
                this.showPermissionPrompt();
                break;
            case 'orientation':
                await this.enableOrientation();
                break;
            case 'manual':
                this.enableManual();
                break;
        }
    }

    async enableWebXR(mode) {
        // WebXR 实现
        console.log('Using WebXR mode');
        this.currentMode = 'webxr';
    }

    async enableOrientation() {
        this.handlers.orientation = new OrientationCamera(this.camera);
        await this.handlers.orientation.enable();
        console.log('Using DeviceOrientation mode');
        this.currentMode = 'orientation';
    }

    enableManual() {
        this.handlers.manual = new ManualCamera(this.camera, this.domElement);
        console.log('Using Manual control mode');
        this.currentMode = 'manual';
        this.showManualHint();
    }

    showPermissionPrompt() {
        // 显示权限请求 UI
    }

    showManualHint() {
        // 显示操作提示："拖拽屏幕旋转视角"
    }

    dispose() {
        Object.values(this.handlers).forEach(handler => {
            if (handler && handler.disable) {
                handler.disable();
            }
        });
    }
}
```

### 6.2 使用示例

```javascript
// 初始化
const trackingManager = new TrackingManager(camera, renderer.domElement);

// 自动选择最佳模式
await trackingManager.initialize();

// 渲染循环
function animate() {
    requestAnimationFrame(animate);
    
    // TrackingManager 已经处理了相机更新
    renderer.render(scene, camera);
}

animate();
```

---

## 7. 用户体验建议

### 7.1 降级提示设计

**Level 1 → Level 2 降级：**
```
"您的设备不支持 WebXR，已切换到陀螺仪模式。
体验可能略有差异，但主要功能仍可正常使用。"
```

**Level 2 → Level 3 降级：**
```
"无法访问陀螺仪，已切换到手动控制模式。
您可以通过触摸屏幕拖拽来控制视角。"
```

### 7.2 功能对比表

| 功能 | WebXR | DeviceOrientation | 手动控制 |
|------|-------|-------------------|----------|
| 头部追踪 | ✅ 完整 | ✅ 基础 | ❌ 无 |
| 位置追踪 | ✅ 6DoF | ❌ 3DoF | ❌ 无 |
| 手柄输入 | ✅ 支持 | ❌ 无 | ✅ 触摸/鼠标 |
| 沉浸感 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 兼容性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 7.3 首次使用引导

```javascript
function showFirstTimeGuide(mode) {
    const guides = {
        webxr: "将设备移动到空间中，体验完整的 AR/VR 效果",
        orientation: "移动设备即可改变视角，点击按钮重新校准方向",
        manual: "触摸并拖拽屏幕来旋转视角"
    };

    showTooltip(guides[mode], 5000); // 显示 5 秒
}
```

---

## 8. 测试检查清单

- [ ] WebXR 模式正常工作（支持的设备）
- [ ] DeviceOrientation 模式正常工作（iOS/Android）
- [ ] iOS 权限请求流程顺畅
- [ ] 权限被拒绝后降级到手动控制
- [ ] 手动控制模式响应灵敏
- [ ] 不同模式间切换无卡顿
- [ ] 降级提示清晰易懂
- [ ] 校准功能正常（DeviceOrientation）
- [ ] 旋转范围限制正确（无翻转）
- [ ] 平滑滤波效果良好

---

## 9. 性能优化

### 9.1 事件节流

```javascript
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

// 应用到 orientation 事件
window.addEventListener('deviceorientation', throttle(onOrientationChange, 16)); // ~60fps
```

### 9.2 减少 DOM 操作

```javascript
// 不好：每次更新都操作 DOM
function updateUI(mode) {
    document.getElementById('mode').textContent = mode;
}

// 好：缓存 DOM 引用
const modeElement = document.getElementById('mode');
function updateUI(mode) {
    modeElement.textContent = mode;
}
```

---

## 10. 参考资源

- [DeviceOrientation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)
- [Requesting Permission for iOS](https://webkit.org/blog/8311/intelligent-tracking-prevention-2-0/)
- [Three.js Camera Controls](https://threejs.org/docs/#examples/en/controls/OrbitControls)
