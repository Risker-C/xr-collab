/**
 * 知天下AI API Routes
 * V0.2 (知天下AI) 的API端点
 * 
 * 路由：
 * POST /api/zhitianxia/reconstruct - 提交3D重建任务
 * GET /api/zhitianxia/task/:taskId - 查询任务状态
 * DELETE /api/zhitianxia/task/:taskId - 取消任务
 * GET /api/zhitianxia/health - 健康检查
 */

const express = require('express')
const multer = require('multer')
const ZhiTianXiaWorker = require('../zhitianxia-worker')

const router = express.Router()

// 配置multer用于批量文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 每个文件10MB
    files: 100 // 最多100张照片
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片文件'), false)
    }
  }
})

// 创建Worker实例
const zhitianxiaWorker = new ZhiTianXiaWorker()

// 存储任务状态（生产环境应使用Redis）
const taskCache = new Map()

/**
 * POST /api/zhitianxia/reconstruct
 * 提交3D重建任务
 */
router.post('/reconstruct', upload.array('photos', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length < 3) {
      return res.status(400).json({
        error: '至少需要上传3张照片'
      })
    }

    console.log(`开始处理 ${req.files.length} 张照片`)

    const photoBuffers = req.files.map(f => f.buffer)
    const filenames = req.files.map(f => f.originalname)

    const result = await zhitianxiaWorker.submitReconstructionTask(
      photoBuffers,
      filenames
    )

    // 缓存任务信息
    taskCache.set(result.taskId, {
      status: 'processing',
      progress: 0,
      photoCount: req.files.length,
      createdAt: Date.now()
    })

    console.log(`任务已提交: ${result.taskId}`)

    res.json({
      success: true,
      taskId: result.taskId,
      estimatedTime: result.estimatedTime,
      photoCount: req.files.length
    })

  } catch (error) {
    console.error('提交任务失败:', error)
    res.status(500).json({
      error: error.message || '提交失败'
    })
  }
})

/**
 * GET /api/zhitianxia/task/:taskId
 * 查询任务状态
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    // 先检查缓存
    const cached = taskCache.get(taskId)
    if (!cached) {
      return res.status(404).json({
        error: '任务不存在'
      })
    }

    // 查询实际状态
    const status = await zhitianxiaWorker.getTaskStatus(taskId)

    // 更新缓存
    taskCache.set(taskId, {
      ...cached,
      ...status,
      lastChecked: Date.now()
    })

    res.json({
      success: true,
      ...status
    })

  } catch (error) {
    console.error('查询任务状态失败:', error)
    res.status(500).json({
      error: error.message || '查询失败'
    })
  }
})

/**
 * DELETE /api/zhitianxia/task/:taskId
 * 取消任务
 */
router.delete('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    await zhitianxiaWorker.cancelTask(taskId)

    // 从缓存中移除
    taskCache.delete(taskId)

    console.log(`任务已取消: ${taskId}`)

    res.json({
      success: true,
      message: '任务已取消'
    })

  } catch (error) {
    console.error('取消任务失败:', error)
    res.status(500).json({
      error: error.message || '取消失败'
    })
  }
})

/**
 * GET /api/zhitianxia/health
 * 健康检查
 */
router.get('/health', async (req, res) => {
  try {
    const health = await zhitianxiaWorker.healthCheck()
    
    res.json({
      service: 'zhitianxia',
      timestamp: new Date().toISOString(),
      api: health,
      activeTasks: taskCache.size
    })

  } catch (error) {
    console.error('健康检查失败:', error)
    res.status(503).json({
      service: 'zhitianxia',
      timestamp: new Date().toISOString(),
      error: error.message,
      api: {
        status: 'error',
        version: '0.0.0'
      }
    })
  }
})

/**
 * GET /api/zhitianxia/tasks
 * 获取所有���务列表
 */
router.get('/tasks', (req, res) => {
  const tasks = Array.from(taskCache.entries()).map(([taskId, data]) => ({
    taskId,
    ...data
  }))

  res.json({
    success: true,
    tasks,
    total: tasks.length
  })
})

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: '文件过大，单个文件最大支持10MB'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: '文件数量过多，最多支持100张照片'
      })
    }
  }

  console.error('知天下AI路由错误:', error)
  res.status(500).json({
    error: error.message || '服务器内部错误'
  })
})

// 定期清理过期任务（24小时）
setInterval(() => {
  const now = Date.now()
  const expireTime = 24 * 60 * 60 * 1000 // 24小时

  for (const [taskId, data] of taskCache.entries()) {
    if (now - data.createdAt > expireTime) {
      taskCache.delete(taskId)
      console.log(`清理过期任务: ${taskId}`)
    }
  }
}, 60 * 60 * 1000) // 每小时清理一次

module.exports = router
