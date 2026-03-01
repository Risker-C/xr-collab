# R2 连接诊断报告

## 根本原因
- `r2-client.js` 的健康检查使用 `HeadObjectCommand` 请求一个不存在的 key。
- Cloudflare R2 对不存在对象返回错误名为 **`NotFound`**（而非 `NoSuchKey`），导致健康检查将 **正常的 404** 当成失败。
- 结果：`storage-adapter.js` 认为健康检查失败并禁用 R2（日志出现 `⚠️ R2 health check failed, disabling R2`）。

## 修复方案
- 将健康检查改为 `HeadBucketCommand`（避免 `ListBuckets` 的 AccessDenied 权限问题）。
- 保留对 404/NotFound/NoSuchKey 的显式判断，确保错误语义清晰。

## 测试结果
- ✅ `HeadBucket` 校验：成功（Bucket 可访问）
- ✅ `healthCheck()`：`{ success: true, status: 'connected' }`
- ✅ 上传测试：`PutObject` 成功
- ⚠️ `ListBuckets`：AccessDenied（账户级权限限制，属预期）

## 结论
R2 本身连接正常，问题为健康检查逻辑错误导致误判。修复后 R2 初始化应可正常通过。
