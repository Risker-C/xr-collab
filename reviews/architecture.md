# 架构审查报告

## 🔴 架构问题 (Critical)
- **核心状态过度依赖单进程内存，无法横向扩展且重启即丢失**：房间/用户/聊天/白板锁/操作日志/扫描会话/任务缓存/限流均使用内存 Map，未统一持久化或分布式协调，Socket.IO 也未接入共享适配器（多实例广播失效）。位置：`backend/server.js`（users/chatHistory/whiteboardLocks/operationLogs）、`backend/rooms.js`、`backend/scan-manager.js`、`backend/routes/zhitianxia.js`、`backend/routes/kiri.js`、`backend/rate-limiter.js`
- **扫描 API 与实现不一致，接口将失效**：`/api/scan/:scanId/pointcloud` 调用 `scanManager.getPointCloud`，`/api/rooms/:roomId/scans` 调用 `scanManager.getRoomScans`，但 `scan-manager.js` 中不存在这些方法；同时 `createSession/deleteSession` 为 async 却未 await。位置：`backend/server.js` vs `backend/scan-manager.js`
- **ML-Sharp 路由存在语法级冲突**：同一文件中 `const generateHandler` 被重复声明，Node 解析会直接抛错，导致服务无法启动。位置：`backend/routes/ml-sharp.js`

## 🟡 改进建议 (Improvement)
- **统一 API 版本与资源命名**：当前路径混用 `/api/files/upload`、`/api/scan/session`、`/api/worker/execute` 等 RPC 风格；建议引入 `/v1` 前缀，并按资源化命名（POST `/files`、POST `/scans`、POST `/workers/tasks`）。
- **错误响应格式不一致**：`{ error }`、`{ success, error }`、HTTP 状态码使用不统一；建议统一错误 schema（code/message/details）。位置：`backend/server.js`、`backend/routes/*.js`
- **鉴权覆盖不一致**：部分敏感读写（文件下载、扫描状态、房间资源）未统一鉴权/授权策略；建议集中在中间件中明确规则。
- **硬编码外部依赖**：WorkerBridge 的 worker 列表为硬编码 URL，建议改为配置化并支持熔断/回退策略。位置：`backend/worker-bridge.js`
- **重复工具函数分散**：`deepClone/normalize` 等在多个文件重复实现，建议抽到 `shared/utils` 统一复用。位置：`backend/rooms.js`、`backend/undo-redo.js`、`backend/file-manager.js`

## 🟢 重构建议 (Refactoring)
- **拆分“God File”**：将 `backend/server.js` 拆分为 `routes/`（HTTP 控制器）、`sockets/`（实时事件处理）、`services/`（Room/File/Scan/Whiteboard 业务）、`repositories/`（Redis/FS/DB）以提升 SoC 与可测试性。
- **状态存储抽象化**：引入 Repository 接口，把房间/用户/白板/操作日志/任务缓存迁移到 Redis/DB；Socket.IO 使用 Redis Adapter，支持多实例一致性。
- **文件与模型存储升级**：文件元数据改为数据库（Postgres/SQLite）+ 对象存储（S3/OSS）；`metadata.json` 仅适合单机开发环境。位置：`backend/file-manager.js`
- **共享类型与事件协议**：抽离 Socket 事件名/DTO 到 `shared` 包，前后端共用类型，降低演进成本。位置：`frontend/app/vr/page.tsx` + `backend/server.js`

## ✅ 良好设计
- **命令模式用于撤销/重做**：`OperationLogManager` + `Command` 体系支持合并更新、时序回放，扩展性好。位置：`backend/undo-redo.js`
- **点云流式落盘避免内存爆炸**：`ScanManager` 使用 JSONL + 分页读取 + 资源上限控制。位置：`backend/scan-manager.js`
- **文件类型安全校验**：Magic Number 校验与危险类型黑名单，有效防止伪装文件上传。位置：`backend/file-type-validator.js`
- **WorkerBridge 健康检查与故障切换**：支持多 worker 轮询 + fallback。位置：`backend/worker-bridge.js`
- **API 设计文档化**：`mobile-scan-sdk/api-design/openapi.yaml` 提供 OpenAPI 规范和版本化服务器地址，利于对外合作与 SDK 集成。
