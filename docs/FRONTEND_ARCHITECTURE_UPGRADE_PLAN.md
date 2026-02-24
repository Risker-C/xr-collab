# XR Collab WebXR 平台前端架构升级方案（React + Vision Pro Design + WebXR）

> 面向当前 `frontend/app.js` 单文件架构（1667 行 / 51KB）与 UI 崩溃问题，给出可落地、可验证、可回滚的升级方案。

---

## 0. 现状诊断（基于代码审计）

### 0.1 关键问题（已确认）

1. **单文件过大、职责耦合严重**
   - `frontend/app.js`: `1667` 行，约 `51KB`。
   - 场景初始化、输入控制、Socket 协议、白板、扫描、聊天、UI 逻辑混杂，导致：
     - 修改风险高
     - 回归测试范围大
     - 新人接手难

2. **CSS 引用错误导致 UI 样式失效**
   - `index.html` 引用：`style-v2.css`
   - 实际存在：`style.css`
   - 结果：样式加载失败时，布局与交互层级崩溃。

3. **DOM 契约不一致（旧 JS 依赖的 ID 在新 HTML 中缺失）**
   - `app.js` 依赖但当前 `index.html` 缺失的 ID 包括：
     - `controls`, `status`, `room-info`, `room-info-text`
     - `undo-btn`, `redo-btn`, `history-count`
     - `chat-open-btn`, `chat-toggle`, `worker-result`
   - 直接后果：`null` 访问、交互不生效、功能“看似加载但不可用”。

4. **全局状态暴露方式存在隐患**
   - `window.currentRoom = currentRoom` 在初始化时赋值为 `null`，后续 `currentRoom` 变化不会同步到 `window.currentRoom`。
   - 影响：上传、扫描等依赖全局房间状态的模块不稳定。

5. **功能模块与 UI 强耦合**
   - `ScanningUI`、`file-upload.js`、`fullscreen.js` 仍依赖旧 DOM 结构（如 `#controls`），与新 UI 架构冲突。

---

## 1. 技术选型分析（含优先级排序）

> 评分维度：WebXR 适配（30%）/ 可维护性（25%）/ 性能（20%）/ 开发体验（15%）/ 生态成熟度（10%）

---

### 1.1 主框架：React vs Vue vs Vanilla

| 方案 | 结论 | 优势 | 风险/不足 |
|---|---|---|---|
| **React（推荐 #1）** | ✅ 最优 | 与 React Three Fiber / @react-three/xr 生态强耦合；组件化和状态管理成熟；TS 支持强；招聘与社区优势明显 | 需要团队统一 Hooks/状态切片规范，避免“又回到巨型组件” |
| Vue（备选 #2） | ⚠️ 可行 | 语法友好，上手快 | WebXR 核心生态不如 React 完整，3D/XR 资料和社区模板更少 |
| Vanilla（不推荐 #3） | ❌ 不建议继续 | 轻量、无框架负担 | 已证明在当前规模下不可维护；缺乏架构边界与工程化约束 |

**结论**：采用 **React + TypeScript**。

---

### 1.2 3D 引擎层：React Three Fiber vs 原生 Three.js

| 方案 | 结论 | 优势 | 风险/不足 |
|---|---|---|---|
| **React Three Fiber（推荐 #1）** | ✅ 主选 | 声明式场景，便于拆分组件；与 React 状态系统自然结合；可与 Drei/XR 生态配套；性能接近原生 | 团队需熟悉“React 渲染生命周期 + 渲染帧循环”的边界 |
| **R3F + 原生 Three 混合（推荐实践）** | ✅ 实战最佳 | 高频/底层优化可直接 escape hatch 到原生 Three（LOD、Instancing、后处理） | 需制定“何时用声明式/何时用 imperative”规范 |
| 原生 Three.js 全量（备选 #2） | ⚠️ 可行但次优 | 性能可控、API 直接 | UI/状态/网络与渲染层耦合风险高，重复当前问题 |

**结论**：采用 **R3F 为主，原生 Three 为性能关键路径补充**。

---

### 1.3 UI 组件库：@mawtech/glass-ui vs 自建

| 方案 | 结论 | 优势 | 风险/不足 |
|---|---|---|---|
| **@mawtech/glass-ui（推荐 #1）** | ✅ 首选 | 与 Apple Vision Pro 风格对齐（毛玻璃、层次、暗色）；可快速达成设计一致性 | 组件规模有限（18 个），复杂交互仍需补充 |
| **glass-ui + 设计 Token 自建业务组件（推荐落地方式）** | ✅ 最稳 | 快速上线 + 可控扩展；避免全自建初期成本过高 | 需建设内部 UI Wrapper，避免第三方 API 直透业务 |
| 完全自建（备选 #2） | ⚠️ 可行但慢 | 可完全贴合业务 | 工期长、视觉一致性与无障碍成本高 |

**结论**：采用 **glass-ui + 自建业务组件封装层**（而不是“直接散用第三方组件”）。

---

### 1.4 状态管理：Zustand vs Redux vs Context

| 方案 | 结论 | 优势 | 风险/不足 |
|---|---|---|---|
| **Zustand（推荐 #1）** | ✅ 最优 | API 简洁，性能好（按选择器订阅）；非常适合实时协作与 XR 状态切片 | 需规范 slice 边界，防止 store 膨胀 |
| Context（推荐 #2，局部） | ✅ 作为补充 | 适合主题、用户偏好等低频状态 | 高频状态会引发不必要重渲染 |
| Redux Toolkit（备选 #3） | ⚠️ 可行 | 强约束、可追踪 | 对当前项目体量偏重，样板代码较多 |

**结论**：**Zustand 主状态 + Context 只放低频全局配置**。

---

### 1.5 构建工具：Vite vs Webpack

| 方案 | 结论 | 优势 | 风险/不足 |
|---|---|---|---|
| **Vite（推荐 #1）** | ✅ 最优 | 冷启动快、HMR 快；TS + React 支持完善；更适合现代前端架构 | 需要一次性完成构建链迁移 |
| Webpack（备选 #2） | ⚠️ 可行 | 生态成熟、可深度定制 | 配置复杂，开发体验与启动速度不占优 |

**结论**：采用 **Vite + React + TypeScript + SWC**。

---

## 2. 推荐目标架构（满足 WebXR + Vision Pro + 可维护）

## 2.1 总体技术栈

- **框架**：React 18 + TypeScript
- **3D/XR**：Three.js + React Three Fiber + `@react-three/xr`
- **UI**：`@mawtech/glass-ui` + 内部 `ui-kit` 封装
- **状态管理**：Zustand（模块化 slices）
- **网络层**：Socket.IO Client（Typed events + schema 校验）
- **构建工具**：Vite
- **样式系统**：Design Tokens（CSS Variables）+ 模块化样式
- **质量保障**：Vitest + Playwright + ESLint + TypeScript Strict

---

## 2.2 架构分层

1. **Presentation（UI）**：面板、按钮、弹层、聊天、列表
2. **XR Scene（3D 场景）**：场景、对象、交互、控制器
3. **Domain Systems（业务系统）**：白板、扫描、多人协作、文件
4. **Data/State（状态）**：房间、用户、对象、白板、扫描
5. **Infra（基础设施）**：Socket、资源加载、性能监控、日志

原则：
- UI 不直接操作 Socket；通过 Store/Action 调用
- Scene 不直接读 DOM；只读状态与事件
- 系统模块不依赖具体 UI 库（可替换）

---

## 3. 推荐项目结构（文件树 + 说明）

```text
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                    # React 入口
    ├── App.tsx                     # 根布局（UI + Canvas）
    │
    ├── components/                 # 通用组件（无业务耦合）
    │   ├── ui/                     # glass-ui 二次封装层
    │   │   ├── GlassPanel.tsx
    │   │   ├── IconButton.tsx
    │   │   └── index.ts
    │   ├── layout/
    │   │   ├── TopNav.tsx
    │   │   ├── LeftSidebar.tsx
    │   │   ├── RightDrawer.tsx
    │   │   └── MobileBottomNav.tsx
    │   └── chat/
    │
    ├── scenes/                     # 3D 场景与 XR
    │   ├── XRScene.tsx
    │   ├── Ground.tsx
    │   ├── AvatarSystem.tsx
    │   ├── ObjectLayer.tsx
    │   ├── WhiteboardLayer.tsx
    │   └── ScanLayer.tsx
    │
    ├── systems/                    # 业务核心系统
    │   ├── collaboration/
    │   │   ├── socket-client.ts
    │   │   ├── events.ts           # typed event contracts
    │   │   └── sync-engine.ts
    │   ├── whiteboard/
    │   │   ├── whiteboard-engine.ts
    │   │   └── whiteboard-actions.ts
    │   ├── scanning/
    │   │   ├── scanning-engine.ts
    │   │   ├── pointcloud-worker.ts
    │   │   └── lod-manager.ts
    │   └── upload/
    │
    ├── stores/                     # Zustand 切片
    │   ├── room.store.ts
    │   ├── user.store.ts
    │   ├── object.store.ts
    │   ├── whiteboard.store.ts
    │   ├── scan.store.ts
    │   ├── ui.store.ts
    │   └── index.ts
    │
    ├── hooks/
    │   ├── useSocketEvents.ts
    │   ├── useXRSession.ts
    │   ├── usePerfBudget.ts
    │   └── useResponsive.ts
    │
    ├── styles/
    │   ├── tokens.css              # Vision Pro tokens
    │   ├── globals.css
    │   └── layers.css              # z-index / overlay contract
    │
    ├── utils/
    │   ├── math.ts
    │   ├── throttle.ts
    │   ├── schema.ts               # zod schema
    │   └── logger.ts
    │
    ├── legacy/
    │   ├── app-bridge.ts           # 兼容旧 window API
    │   └── dom-compat.ts           # 过渡期 DOM 兼容层
    │
    └── workers/
        ├── decode.worker.ts
        └── scan-merge.worker.ts
```

---

## 4. 迁移路径：渐进式重构（推荐）vs 完全重写

## 4.1 方案选择结论

- **推荐：渐进式重构（Strangler Fig 模式）**
- 不建议“一次性重写”原因：
  - 现有多人协作/白板/扫描已在线路中，完全重写风险极高
  - UI 与协议耦合复杂，Big Bang 容易出现功能回退

---

## 4.2 分阶段实施计划（每阶段可验证）

### Phase 0：稳定性止血（1~2 天）

**目标**：先止住“UI 崩溃”和关键流程阻断。

- 修复 CSS 引用（`style-v2.css` → `style.css` 或并行加载新样式）
- 为关键 DOM 缺失点加防御（null-safe）
- 修复 `window.currentRoom/currentUserId` 的同步方式（getter 或 store 订阅）

**验收**：
- 页面可完整渲染
- 加入房间、创建物体、聊天、扫描按钮可点击
- 无阻断性 JS 错误

---

### Phase 1：新架构脚手架并行落地（3~5 天）

**目标**：在不影响线上功能前提下引入新技术栈。

- 引入 Vite + React + TS
- 建立 `src/` 分层目录
- 建立 `legacy/app-bridge.ts`，暴露旧 API（`window.createCube` 等）
- 先“嵌入现有 Three 画布”，不立刻重写全部渲染逻辑

**验收**：
- HMR 正常
- TypeScript strict 通过
- 旧按钮仍可触发核心功能

---

### Phase 2：状态与网络层重构（4~6 天）

**目标**：解耦 `app.js` 的“状态 + Socket 混合逻辑”。

- 引入 Zustand 切片：room/user/object/whiteboard/scan/ui
- 抽离 Socket 客户端与事件分发
- 用 typed schema（建议 zod）校验关键消息结构

**验收**：
- 加入/离开房间、用户同步、对象同步与当前行为一致
- 断线重连成功率与现网持平或更好
- 事件日志可追踪

---

### Phase 3：3D 场景迁移到 R3F（5~8 天）

**目标**：将场景渲染从 imperative 大文件迁移到可组合组件。

- 建立 `XRScene` / `ObjectLayer` / `AvatarSystem`
- 保留现有 `MaterialRegistry`、`GeometryRegistry`、`CullingOptimizer`
- 逐步接入 `@react-three/xr`，先完成 VR 进入/退出和控制器

**验收**：
- 桌面 + VR 均可创建/移动/删除对象
- 平均 FPS 不低于现网（关键场景至少持平）

---

### Phase 4：白板系统迁移（4~6 天）

**目标**：保留全部白板能力并完成权限模型对齐。

- 将 `whiteboard-system.js` 拆分为 engine + store + ui
- 保持现有 socket 协议不变（`whiteboard:*`）
- 引入锁机制可视化状态（host/member）

**验收**：
- 绘制/文本/箭头/橡皮/撤销重做/锁竞争功能全可用
- 多人并发操作一致性通过

---

### Phase 5：扫描系统迁移（4~7 天）

**目标**：扫描能力模块化，并为移动端与 LOD 做准备。

- `scanning-ui.js` 重构为 React 组件 + scanning engine
- 点云预览、历史、完成发布流程迁移
- 扫描结果层接入 LOD 管理器

**验收**：
- `scan:create/start/upload/complete/list/delete` 全流程跑通
- 扫描 UI 与主 UI 样式统一

---

### Phase 6：Vision Pro 设计系统 + 性能封顶（持续）

**目标**：视觉升级 + 性能稳定 + 移动端完美适配。

- 接入 glass tokens + SF 字体栈 + 分层深度阴影
- 完成代码分割、懒加载、LOD 与动态画质策略
- 完成性能预算仪表盘（FPS / drawCalls / 内存 / RTT）

**验收**：
- 手机、平板、桌面、VR 全端通过回归
- 关键性能指标达到目标（见第 6 节）

---

## 4.3 兼容性保证策略（app.js 现有功能）

1. **协议不变**：后端 `socket events` 维持兼容（`object-*`, `whiteboard-*`, `scan-*`）
2. **API Bridge**：过渡期保留 `window.createCube/joinRoom/...`
3. **行为快照测试**：
   - 黄金路径：加入房间 → 创建对象 → 拖拽 → 白板绘制 → 扫描
4. **可回滚发布**：
   - 通过 feature flag 切换 `legacy-ui` / `new-ui`

---

## 5. Apple Vision Pro 设计系统集成方案

## 5.1 Glassmorphism（Liquid Glass）落地

- 统一使用 Design Tokens：
  - 背景透明层（`--glass-bg`）
  - 边界高光（`--glass-border`）
  - 背景模糊（`--glass-blur`）
  - 深度阴影（`--glass-shadow`）
- 组件层禁止写死颜色，统一走 token
- 保持“半透明 + 层次 + 深度感”，避免纯平 UI

---

## 5.2 SF Pro 字体栈配置

> 注意：SF Pro 不建议作为 Web 字体文件直接分发；建议使用系统字体栈。

```css
:root {
  --font-sans: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont,
               "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
body { font-family: var(--font-sans); }
```

---

## 5.3 响应式断点（桌面 / 平板 / 手机 / VR）

建议断点：
- `xs`: `< 480`（手机竖屏）
- `sm`: `480 - 767`（手机横屏）
- `md`: `768 - 1023`（平板）
- `lg`: `1024 - 1439`（桌面）
- `xl`: `>= 1440`（大屏）
- `xr`: WebXR immersive 模式（独立布局策略）

XR 模式下：
- 减少 2D overlay，保留核心 HUD
- 将高频操作转为 3D 浮动面板

---

## 5.4 Z-index 层级管理规范

```css
:root {
  --z-canvas: 0;
  --z-world-ui: 100;       /* 3D HUD */
  --z-top-nav: 500;
  --z-side-panel: 700;
  --z-drawer: 800;
  --z-chat: 900;
  --z-modal: 1200;
  --z-toast: 1400;
  --z-debug: 1600;
}
```

禁止业务组件自行写 `z-index: 99999`，统一走层级 Token。

---

## 6. 性能优化策略（保证“性能不下降”）

## 6.1 渲染性能

1. **LOD 策略**
   - 近景：高精模型
   - 中景：中精模型
   - 远景：低精/代理模型
   - 超远景：隐藏
2. **实例化渲染**（保留/扩展 InstancedMesh）
3. **纹理压缩**（KTX2/Basis，保留当前管线）
4. **动态质量降级**
   - FPS 连续低于阈值，自动降低阴影级别/后处理
5. **WebXR 专项**
   - 启用 foveation（设备支持时）
   - 降低 VR 模式下 UI redraw 频率

---

## 6.2 代码分割与懒加载

- 路由/模块级懒加载：
  - 扫描模块
  - 白板高级工具
  - 性能面板
- 三方重库按需加载：
  - 扫描点云处理 Worker
  - 高级后处理

---

## 6.3 网络优化（多人协作）

- 位置同步继续节流（当前约 80ms）
- 高频消息增量化（delta patch）
- 批量发送 + 优先级队列
- 重连后状态快照恢复

---

## 6.4 性能预算（建议）

- 桌面：
  - 普通模式 `>= 60 FPS`
  - VR 模式 `>= 72 FPS`
- 移动端：`>= 45 FPS`（稳定，无明显卡顿峰值）
- 首屏交互可用（TTI）：`< 3s`
- 房间广播延迟：`p95 < 150ms`
- Draw Calls：核心场景 `<= 300`（目标值）

---

## 7. 关键代码示例（配置 + 核心组件）

## 7.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 900
  }
})
```

## 7.2 Zustand 房间状态切片 `room.store.ts`

```ts
import { create } from 'zustand'

type RoomState = {
  roomId: string | null
  username: string
  connected: boolean
  setRoom: (id: string | null) => void
  setUsername: (name: string) => void
  setConnected: (v: boolean) => void
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  username: '用户',
  connected: false,
  setRoom: (roomId) => set({ roomId }),
  setUsername: (username) => set({ username }),
  setConnected: (connected) => set({ connected })
}))
```

## 7.3 XR 场景骨架 `XRScene.tsx`

```tsx
import { Canvas } from '@react-three/fiber'
import { XR, Controllers } from '@react-three/xr'
import { Suspense } from 'react'

export function XRScene() {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 8]} intensity={0.8} castShadow />

      <XR>
        <Controllers />
        <Suspense fallback={null}>
          {/* Ground / ObjectLayer / AvatarSystem / WhiteboardLayer / ScanLayer */}
        </Suspense>
      </XR>
    </Canvas>
  )
}
```

## 7.4 Vision Pro 设计 Token `styles/tokens.css`

```css
:root {
  --glass-bg: color-mix(in srgb, #ffffff 14%, transparent);
  --glass-border: color-mix(in srgb, #ffffff 28%, transparent);
  --glass-blur: 20px;
  --glass-shadow: 0 8px 40px rgba(0, 0, 0, 0.32);

  --radius-lg: 16px;
  --radius-xl: 20px;

  --font-sans: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont,
               "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-xl);
}
```

## 7.5 过渡期兼容层 `legacy/app-bridge.ts`

```ts
import { useObjectStore } from '@/stores/object.store'

declare global {
  interface Window {
    createCube?: () => void
  }
}

export function installLegacyBridge() {
  window.createCube = () => useObjectStore.getState().createObject('cube')
  // 同理挂载 createSphere / deleteAll / joinRoom ...
}
```

---

## 8. 风险评估与应对方案

| 风险 | 级别 | 描述 | 应对 |
|---|---|---|---|
| 迁移期间功能回退 | 高 | 白板/扫描/多人协作链路长，容易遗漏 | 分阶段上线 + feature flag + 黄金路径自动化回归 |
| 第三方 UI 库能力不足 | 中 | glass-ui 组件数量有限 | 建立 UI Wrapper，复杂场景自建；避免业务直接依赖第三方 API |
| 性能不达标 | 高 | React 层误用导致重渲染开销 | Zustand 选择器 + memo + scene 分层 + FPS 预算守护 |
| 多端适配复杂 | 高 | 手机/平板/VR 交互范式不同 | 响应式 + XR 专属布局策略，分端验收标准 |
| 团队学习曲线 | 中 | R3F/XR 需要新心智模型 | 统一编码规范 + 模板组件 + code review checklist |

---

## 9. 最终推荐结论（可直接执行）

1. **技术栈最终建议（优先级）**
   - 主框架：**React + TypeScript**
   - 3D/XR：**React Three Fiber + @react-three/xr + 原生 Three 关键路径补充**
   - UI：**@mawtech/glass-ui + 内部封装层（Vision Pro Token 驱动）**
   - 状态：**Zustand（模块化切片）**
   - 构建：**Vite（HMR + 高开发效率）**

2. **迁移策略**
   - 采用 **渐进式重构**（而非一次性重写）
   - 先止血（样式/DOM 契约），再并行迁移，再逐模块替换

3. **强约束目标**
   - 保持现有三大能力：**白板、扫描、多人协作**
   - 移动端体验不降级
   - 性能不下降（关键指标守护）
   - 开发体验显著提升（TS strict + 快速 HMR + 组件化）

---

## 10. 建议的第一周执行清单（落地版）

- Day 1: 修复 CSS 引用 + DOM 契约止血
- Day 2: 建 Vite + React + TS 脚手架，保留旧功能可用
- Day 3: Zustand 房间/用户状态迁移
- Day 4: Socket 客户端封装 + 事件类型定义
- Day 5: 构建 `XRScene` 骨架 + 对象创建链路打通

> 第一周完成后，就能进入“旧系统可运行 + 新架构可并行开发”的正循环。
