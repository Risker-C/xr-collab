# XR Collab 建筑扫描功能技术架构设计

## 1. 目标与范围

### 1.1 目标
- 在 XR Collab 现有实时协作系统上新增建筑扫描能力。
- 支持 WebXR 端实时采集预览，移动端高质量摄影测量采集。
- 在多人协作房间中实现扫描进度、结果、版本的实时同步。
- 在中低端移动设备上仍可稳定浏览（LOD + 分层加载）。

### 1.2 范围
覆盖以下五层能力：
1. 扫描数据采集层（WebXR Device API + 摄影测量）
2. 点云处理层（降噪、重建、简化）
3. 渲染引擎集成层（Three.js 场景管理）
4. 网络同步层（WebSocket 协议扩展）
5. 性能优化层（LOD、多线程、内存管理）

---

## 2. 系统总体架构图（ASCII）

```text
┌────────────────────────────────────────────────────────────────────┐
│                         Client Layer                               │
│ ┌─────────────────────┐      ┌──────────────────────────────────┐  │
│ │ WebXR Web Client    │      │ Mobile Scan SDK (iOS/Android)   │  │
│ │ - XR Session        │      │ - ARKit/ARCore + CameraX/AVF    │  │
│ │ - Pose/Frame采集     │      │ - LiDAR(可选) + Photo Capture   │  │
│ │ - Three.js预览       │      │ - Chunk Upload / Resume         │  │
│ └──────────┬──────────┘      └───────────────┬──────────────────┘  │
└────────────┼──────────────────────────────────┼─────────────────────┘
             │ WebSocket(scan:*)               │ HTTPS(Upload/API)
             ▼                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Collaboration Gateway Layer                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Node.js + Socket.IO Gateway                                   │ │
│ │ - 房间与鉴权(JWT)  - scan事件路由  - 进度广播  - 版本控制       │ │
│ └──────────┬───────────────────────────────┬────────────────────┘ │
│            │                               │                      │
│            ▼                               ▼                      │
│   Redis(Room State/Event Bus)      MySQL(Metadata/Index)         │
└────────────┬───────────────────────────────┬──────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Processing & Storage Layer                      │
│ ┌──────────────────────┐      ┌─────────────────────────────────┐ │
│ │ Scan Orchestrator    │─────▶│ Point Cloud Workers (C++/Py)   │ │
│ │ - 任务编排/状态机      │      │ - SfM/MVS - 降噪 - 重建 - LOD  │ │
│ └──────────┬───────────┘      └──────────────┬──────────────────┘ │
│            │                                   │                    │
│            ▼                                   ▼                    │
│      Object Storage(S3)                CDN + Model Delivery API    │
└────────────┬───────────────────────────────────┬────────────────────┘
             │                                   │
             ▼                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                        Rendering Layer                             │
│ Three.js Scene Manager + LOD Manager + Streaming Loader           │
│ - 点云/网格加载  - 进度态可视化  - 多人锚点对齐                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. 分层模块设计

## 3.1 扫描数据采集层（WebXR Device API + 摄影测量）

### 职责
- 统一采集 RGB 图像、相机位姿、IMU（可选深度）。
- 采集质量实时评估（模糊、重叠率、曝光）。
- 断点续传上传（分片、校验、重试）。

### 关键组件
- `WebCaptureAdapter`（Web）
  - `navigator.xr` 获取 pose
  - `WebGL/Canvas` 提取关键帧
  - iOS/Safari fallback 使用 `DeviceOrientation`（仅方向辅助）
- `MobileCaptureAdapter`（iOS/Android）
  - iOS: ARKit + AVFoundation
  - Android: ARCore + CameraX
- `CaptureQualityGuard`
  - 拉普拉斯方差检测模糊
  - 相邻帧特征点重叠度检测
- `UploadClient`
  - 复用现有 `/api/capture/upload/init|chunk|complete`
  - 支持并行分片（默认并发 3）

### 输入/输出数据结构（核心）
- 输入（采集帧）
  - `frameId, timestamp, imageUri|blob, intrinsics, pose(4x4), imu?, depth?`
- 输出（会话）
  - `scanSessionId, captureManifest.json, frameChunks/*.bin`

### 采集策略建议
- 关键帧频率：`1~2 fps`（摄影测量），位姿频率：`30~60 Hz`
- 场景重叠度：`>= 70%`
- 推荐扫描距离：`1.5m ~ 3m`

---

## 3.2 点云处理层（降噪、重建、简化）

### 职责
- 从图像 + 位姿恢复稠密点云与网格。
- 自动执行降噪、洞补、重建和多级 LOD 生成。

### 处理流水线
1. **预处理**：畸变校正、帧筛选（去重/去模糊）
2. **SfM**：特征提取与匹配、增量式重建、BA优化
3. **MVS**：深度估计与稠密点云融合
4. **降噪**：SOR + Radius Outlier Removal
5. **重建**：Poisson / TSDF（按设备能力与场景切换）
6. **简化**：QEM 网格简化，输出 LOD0~LOD3
7. **压缩发布**：glTF/GLB + Draco + KTX2

### 算法与引擎建议
- SfM/MVS：`COLMAP`（主选）+ OpenMVG（备选）
- 点云处理：`Open3D` + `PCL`
- 网格简化：`Quadric Error Metrics`
- 纹理烘焙：`xatlas + glTF pipeline`

### 作业状态机
`UPLOADED -> PREPROCESSING -> RECONSTRUCTING -> OPTIMIZING -> LOD_BUILT -> PUBLISHED -> FAILED`

---

## 3.3 渲染引擎集成层（Three.js 场景管理）

### 职责
- 在现有 `frontend/app.js` 场景中挂接扫描资产生命周期。
- 支持扫描中的实时预览点云 + 完成后高质量网格替换。

### 新增子模块
- `ScanAssetManager`
  - 扫描对象注册、版本切换、资源释放
- `PointCloudPreviewRenderer`
  - 处理处理中增量点云（低密度）
- `MeshStreamLoader`
  - 按 LOD 拉取 glTF，支持渐进加载
- `AnchorAlignService`
  - 房间坐标与扫描坐标的锚点对齐

### 场景对象规范
- 对象类型：`scan-preview-pointcloud`, `scan-mesh`, `scan-anchor`
- `userData` 增加：`scanId, version, lod, ownerId, transformRef`

### 与现有模块衔接
- 复用：`CullingOptimizer`, `PerformanceMonitor`, `MaterialRegistry`
- 扩展：在 `createObject/loadRoomObjects` 分支支持 `scan-*` 类型

---

## 3.4 网络同步层（WebSocket 协议扩展）

### 职责
- 在房间内同步扫描会话状态、进度、预览数据、结果发布。
- 保证弱网可恢复（ack + seq + 重放）。

### 协议扩展原则
- 基于现有 Socket.IO 事件模型，新增 `scan:*` 命名空间。
- 关键消息带 `seq`、`version`、`sessionId`，支持幂等。

### 建议事件定义

#### Client -> Server
- `scan:create`：创建扫描会话
- `scan:start`：开始采集
- `scan:progress`：上报本地采集进度
- `scan:preview:push`：推送预览点云块（可选）
- `scan:publish`：请求发布扫描结果
- `scan:subscribe`：订阅某个 scanId 的更新

#### Server -> Client
- `scan:created`
- `scan:state`（状态机变更）
- `scan:progress`
- `scan:preview:patch`
- `scan:lod:ready`
- `scan:published`
- `scan:error`

### 消息信封（建议）
```json
{
  "event": "scan:progress",
  "roomId": "AB12CD",
  "scanId": "scan_20260223_xxx",
  "sessionId": "sess_xxx",
  "seq": 1024,
  "ts": 1771852000123,
  "payload": {}
}
```

---

## 3.5 性能优化层（LOD、多线程、内存管理）

### LOD 策略（与现有 mobile-scan-sdk 对齐）
- LOD0：8K triangles，首帧预览
- LOD1：75K triangles，移动端默认
- LOD2：200K triangles，高端手机/PC
- LOD3：500K+ triangles，离线高精模式

### 多线程策略
- 前端：
  - Web Worker: Draco 解码、点云块合并
  - OffscreenCanvas（支持设备）做预处理
- 后端：
  - BullMQ/Redis Stream 调度
  - Worker 池并行处理 SfM/MVS 子任务

### 内存管理策略
- 前端内存预算：移动端 JS Heap <= 220MB
- 只保留 `当前LOD + 相邻LOD`，其余回收
- 点云分页（按 octree node）加载，超出视锥卸载
- 纹理统一 KTX2，避免未压缩纹理常驻

### 关键性能指标
- 协作延迟（房间广播）：`p95 < 150ms`
- 扫描预览首帧：`< 2s`
- LOD切换卡顿：`< 50ms` 主线程阻塞
- 崩溃率：`< 0.5%`

---

## 4. 模块依赖关系

## 4.1 依赖图（简化）
```text
采集层 -> 上传API -> 编排层 -> 点云处理层 -> 资产存储/CDN -> 渲染层
                 \-> 网络同步层 <------------------------------/
性能优化层 -> (横切) 采集层/处理层/渲染层/网络层
```

## 4.2 依赖矩阵
| 模块 | 直接依赖 | 被谁依赖 |
|------|----------|----------|
| 扫描数据采集层 | WebXR/ARKit/ARCore, Upload API | 点云处理层, 网络同步层 |
| 点云处理层 | 对象存储, 队列, 算法库 | 渲染引擎集成层, 网络同步层 |
| 渲染引擎集成层 | Model API, WebSocket, Three.js | 前端交互层 |
| 网络同步层 | Socket.IO, Redis, RoomManager | 采集层/渲染层/协作UI |
| 性能优化层 | Worker, LOD规则, 监控系统 | 全模块 |

---

## 5. 数据流设计

## 5.1 主数据流（离线重建 + 在线协作）
```text
[用户开始扫描]
   -> 采集关键帧/位姿
   -> 分片上传(Chunk)
   -> 服务器组装Manifest
   -> 创建重建任务(Job)
   -> Worker执行SfM/MVS/降噪/重建/LOD
   -> 产物写入S3 + Metadata入库
   -> WebSocket广播 scan:lod:ready / scan:published
   -> 客户端按设备能力加载对应LOD
   -> 房间内协同查看/标注/测量
```

## 5.2 实时预览流（可选）
```text
采集端局部点云抽样 -> scan:preview:push -> Gateway转发 ->
同房间客户端scan:preview:patch -> Three.js临时点云渲染
```

## 5.3 失败恢复流
```text
网络中断 -> 客户端查询 /api/capture/upload/status/{uploadId}
         -> 跳过已完成chunk -> 继续上传
Worker失败 -> scan:state=FAILED + errorCode
         -> 支持从最近成功阶段重试（不重复上传）
```

---

## 6. API 接口定义

## 6.1 HTTP API（外部）

### 1) 创建扫描会话
`POST /api/scan/session`

Request:
```json
{
  "roomId": "AB12CD",
  "captureMode": "photogrammetry",
  "deviceProfileId": "profile-abc123",
  "options": {
    "enableDepth": true,
    "targetQuality": "high"
  }
}
```
Response:
```json
{
  "scanId": "scan_20260223_001",
  "sessionId": "sess_001",
  "upload": {
    "uploadId": "upload_001",
    "chunkSize": 5242880
  },
  "state": "UPLOADED"
}
```

### 2) 复用分片上传
- `POST /api/capture/upload/init`
- `POST /api/capture/upload/chunk`
- `POST /api/capture/upload/complete`

> 建议在 `metadata` 增加：`scanId`, `sessionId`, `frameRange`, `hasDepth`, `poseCount`。

### 3) 查询扫描状态
`GET /api/scan/{scanId}/status`

Response:
```json
{
  "scanId": "scan_20260223_001",
  "state": "OPTIMIZING",
  "progress": 72,
  "currentStage": "mesh_simplification",
  "etaSec": 180
}
```

### 4) 获取扫描结果 LOD
`GET /api/scan/{scanId}/lod/{level}?format=glTF`

Response:
```json
{
  "scanId": "scan_20260223_001",
  "lod": 1,
  "downloadUrl": "https://cdn.../scan_20260223_001/lod1.glb",
  "etag": "abc123",
  "metadata": {
    "triangles": 75000,
    "textureSize": 2048,
    "fileSizeBytes": 2600000
  }
}
```

### 5) 发布到房间
`POST /api/scan/{scanId}/publish`

Request:
```json
{
  "roomId": "AB12CD",
  "anchor": {
    "position": {"x": 0, "y": 0, "z": 0},
    "rotation": {"x": 0, "y": 0, "z": 0},
    "scale": {"x": 1, "y": 1, "z": 1}
  }
}
```

## 6.2 WebSocket API（`scan:*` 扩展）

| 事件 | 方向 | 说明 |
|------|------|------|
| `scan:create` | C->S | 房间内创建扫描任务 |
| `scan:created` | S->C | 返回 `scanId/sessionId` |
| `scan:state` | S->C | 状态变更广播 |
| `scan:progress` | 双向 | 采集或处理进度 |
| `scan:preview:push` | C->S | 发送预览点云块 |
| `scan:preview:patch` | S->C | 广播预览点云块 |
| `scan:lod:ready` | S->C | 某 LOD 可用 |
| `scan:published` | S->C | 扫描对象已发布到场景 |
| `scan:error` | S->C | 错误码与恢复建议 |

错误码建议：
- `SCAN_UPLOAD_INCOMPLETE`
- `SCAN_RECONSTRUCTION_FAILED`
- `SCAN_LOW_QUALITY_INPUT`
- `SCAN_PERMISSION_DENIED`

## 6.3 内部 API（Gateway -> Worker）
- 协议建议：`gRPC`（低延迟）或 `HTTP + Queue`
- 核心接口：
  - `StartReconstruction(scanId, manifestUrl)`
  - `GetJobStatus(scanId)`
  - `CancelJob(scanId)`
  - `GenerateLOD(scanId, levels[])`

---

## 7. 技术选型建议

| 层级 | 主选技术 | 备选 | 选型理由 |
|------|----------|------|----------|
| 采集层 | WebXR + ARKit/ARCore | DeviceOrientation降级 | 与现有 XR 前端一致，移动端能力充分 |
| 上传层 | 现有 Chunk Upload API | tus.io | 已有成熟接口与断点续传机制 |
| 重建层 | COLMAP + Open3D/PCL | OpenMVG | 精度和社区成熟度高，适合建筑场景 |
| 编排层 | Node.js + BullMQ + Redis | Temporal | 与当前 Node 后端一致，迁移成本低 |
| 同步层 | Socket.IO `scan:*` 扩展 | 原生WebSocket | 与当前系统兼容，事件模型一致 |
| 渲染层 | Three.js + glTF/Draco/KTX2 | Babylon.js | 已在前端落地，复用现有优化模块 |
| 存储分发 | S3 + CDN + ETag | MinIO私有化 | 可扩展，易于全局分发与缓存 |

---

## 8. 非功能设计（SLA/SLO）

- 上传成功率：`>= 99%`
- 扫描任务成功率：`>= 95%`
- 房间内状态同步延迟：`p95 < 150ms`
- 首次可见预览：`< 2s`
- 模型加载策略：低端设备默认 `LOD0/1`，高端 `LOD2`，桌面可升 `LOD3`

---

## 9. 风险与缓解

1. **尺度漂移（高）**
   - 缓解：加入参考尺度约束（已知长度标记）+ IMU 辅助。
2. **低纹理区域重建差（中）**
   - 缓解：采集引导 + 质量反馈 + 异常区域补拍。
3. **移动端内存压力（高）**
   - 缓解：严格 LOD 预算 + Worker 解码 + 资源回收阈值。
4. **弱网导致同步断裂（中）**
   - 缓解：消息序列号 + ack + replay + 断点续传。

---

## 10. 分阶段落地建议

### Phase 1（2周）最小可用
- 打通采集上传 -> 异步重建 -> LOD1 渲染
- 落地 `scan:create / scan:state / scan:published`

### Phase 2（2~3周）协作增强
- 实时预览点云广播
- 锚点对齐、版本回滚、扫描权限控制

### Phase 3（2周）性能与稳定
- 全链路指标监控
- 低端机专项优化（内存与帧率）
- 重建失败自动重试与告警

---

## 结论

该架构基于项目现有技术栈（Node.js + Socket.IO + Three.js + 分片上传）进行扩展，核心优势是：
- **兼容现有代码与部署体系**，改造成本可控；
- **支持端云协同**，Web端实时、移动端高精采集并存；
- **具备可扩展性**，可逐步演进到更高精度与更大规模协作场景。
