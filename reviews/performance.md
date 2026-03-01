# 性能审查报告

## 🔴 性能瓶颈 (Critical)
- 位置同步每次更新都持久化房间并写 Redis，若客户端按帧上报会导致 Redis 写入风暴与事件循环阻塞。位置：backend/server.js:1229, backend/rooms.js:217 | 影响：Socket 延迟抖动、房间状态吞吐下降
- 物体移动即便标记为 transient 仍先写入房间持久化，再返回，拖拽时会产生大量持久化写。位置：backend/server.js:1626, backend/rooms.js:96 | 影响：Redis 压力上升、协作操作卡顿
- 点云读取整文件进内存再 split/map，百万点级文件会触发内存峰值和长耗时。位置：backend/scan-manager.js:191 | 影响：内存飙升、API 响应超时

## 🟡 优化建议 (Optimization)
- 高频 user-moved 事件直接 setState 导致 React 整页重渲染；建议用 useRef 存储位置、节流到 15–30Hz，再用 requestAnimationFrame 批量更新 UI。位置：frontend/app/vr/page.tsx:125 | 预期提升：20–40%
- 渲染循环未取消且未释放几何体/材质；建议在 cleanup 中 cancelAnimationFrame/renderer.setAnimationLoop(null)，并 dispose 几何体与材质，同时限制 pixelRatio/shadow map 以稳帧。位置：frontend/app/vr/page.tsx:167 | 预期提升：15–30%
- 回放读取使用 LRANGE 全量拉取再过滤，建议改用 ZSET + ZRANGEBYSCORE 或分页索引，避免全量解析。位置：backend/redis-store.js:35 | 预期提升：30–60%
- 文件元数据每次变更全量写 JSON，建议改为批量 flush 或存入 Redis/SQLite，减少 I/O 抖动。位置：backend/file-manager.js:124 | 预期提升：10–25%

## ✅ 良好实践
- 文件内容/缩略图接口设置 long-cache headers，有利于 CDN 与浏览器缓存
- 上传图片自动生成 WebP 优化图与缩略图，减轻网络与解码压力
- 点云写入磁盘并限制单次上传点数，避免内存爆涨
