/**
 * KIRI Engine API Routes
 * V0.1 专业级3D扫描的API端点
 * 
 * 路由：
 * POST /api/kiri/upload - 提交专业级重建任务
 * GET /api/kiri/task/:taskId - 查询任务状态
 * DELETE /api/kiri/task/:taskId - 取消任务
 * GET /api/kiri/pricing - 获取定价信息
 * POST /api/kiri/estimate - 估算成本
 * GET /api/kiri/account - 获取账户信息
 * GET /api/kiri/health - 健康检查
 */

const express = require('express')
const multer = require('multer')
const KIRIWorker = require('../kiri-worker')

const router = express.Router()

// 配置multer用于大文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 每个文件50MB
    files: 200 // 最多200张照片
  },
  fileFilter: (req, file, cb) => {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/tiff', 'image/x-raw']
    if (supportedFormats.some(format => file.mimetype.includes(format))) {
      cb(null, true)
    } else {
      cb(new Error('只支持JPEG、PNG、TIFF、RAW格式'), false)
    }
  }
})

// 创建Worker实例
const kiriWorker = new KIRIWorker()

// 存储任务状态（生产环境应使用Redis）
const taskCache = new Map()

/**
 * POST /api/kiri/upload
 * 提交专业级重建任务
 */
router.post('/upload', upload.array('photos', 200), async (req, res) => {
  try {
    if (!req.files || req.files.length < 10) {
      return res.status(400).json({
        error: '专业级重建至少需要10张照片'
      })
    }

    const { qualityLevel = 'standard', priority = 'false', notes = '' } = req.body
    
    // 解析输出格式
    let outputFormats = ['glb']
    try {
      if (req.body.outputFormats) {
        outputFormats = JSON.parse(req.body.outputFormats)
      }
    } catch (e) {
      console.warn('输出格式解析失败，使用默认值')
    }

    console.log(`开始KIRI处理: ${req.files.length}张照片，质量等级: ${qualityLevel}`)

    const photoBuffers = req.files.map(f => f.buffer)
    const filenames = req.files.map(f => f.originalname)

    const result = await kiriWorker.submitReconstructionTask(
      photoBuffers,
      filenames,
      {
        qualityLevel,
        outputFormats,
        priority: priority === 'true',
        notes
      }
    )

    // 缓存任务信息
    taskCache.set(result.taskId, {
      status: 'processing',
      progress: 0,
      photoCount: req.files.length,
      qualityLevel,
      estimatedCost: result.estimatedCost,
      createdAt: Date.now()
    })

    console.log(`KIRI任务已提交: ${result.taskId}, 预估成本: $${result.estimatedCost}`)

    res.json({
      success: true,
      taskId: result.taskId,
      estimatedCost: result.estimatedCost,
      estimatedTime: result.estimatedTime,
      qualityLevel: result.qualityLevel,
      photoCount: req.files.length
    })

  } catch (error) {
    console.error('KIRI任务提交失败:', error)
    res.status(500).json({
      error: error.message || '提交失败'
    })
  }
})

/**
 * GET /api/kiri/task/:taskId
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
    const status = await kiriWorker.getTaskStatus(taskId)

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
    console.error('查询KIRI任务状态失败:', error)
    res.status(500).json({
      error: error.message || '查询失败'
    })
  }
})

/**
 * DELETE /api/kiri/task/:taskId
 * 取消任务
 */
router.delete('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    await kiriWorker.cancelTask(taskId)

    // 从缓存中移除
    taskCache.delete(taskId)

    console.log(`KIRI任务已取消: ${taskId}`)

    res.json({
      success: true,
      message: '任务已取消'
    })

  } catch (error) {
    console.error('取消KIRI任务失败:', error)
    res.status(500).json({
      error: error.message || '取消失败'
    })
  }
})

/**
 * GET /api/kiri/pricing
 * 获取定价信息
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = await kiriWorker.getPricing()
    
    res.json({
      success: true,
      qualityLevels: pricing
    })

  } catch (error) {
    console.error('获取KIRI定价失败:', error)
    res.status(500).json({
      error: error.message || '获取定价失败'
    })
  }
})

/**
 * POST /api/kiri/estimate
 * 估算成本
 */
router.post('/estimate', async (req, res) => {
  try {
    const { photoCount, qualityLevel = 'standard' } = req.body

    if (!photoCount || photoCount < 10) {
      return res.status(400).json({
        error: '至少需要10张照片'
      })
    }

    const estimate = await kiriWorker.estimateCost(photoCount, qualityLevel)

    res.json({
      success: true,
      ...estimate
    })

  } catch (error) {
    console.error('KIRI成本估算失败:', error)
    res.status(500).json({
      error: error.message || '估算失败'
    })
  }
})

/**
 * GET /api/kiri/account
 * 获取账户信息
 */
router.get('/account', async (req, res) => {
  try {
    const account = await kiriWorker.getAccountInfo()
    
    res.json({
      success: true,
      ...account
    })

  } catch (error) {
    console.error('获取KIRI账户信息失败:', error)
    res.status(500).json({
      error: error.message || '账户查询失败'
    })
  }
})

/**
 * GET /api/kiri/health
 * 健康检查
 */
router.get('/health', async (req, res) => {
  try {
    const health = await kiriWorker.healthCheck()
    
    res.json({
      service: 'kiri-engine',
      timestamp: new Date().toISOString(),
      api: health,
      activeTasks: taskCache.size
    })

  } catch (error) {
    console.error('KIRI健康检查失败:', error)
    res.status(503).json({
      service: 'kiri-engine',
      timestamp: new Date().toISOString(),
      error: error.message,
      api: {
        status: 'error',
        version: '2.0.0'
      }
    })
  }
})

/**
 * GET /api/kiri/tasks
 * 获取所有任务列表
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
        error: '文件过大，单个文件最大支持50MB'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: '文件数量过多，最多支持200张照片'
      })
    }
  }

  console.error('KIRI路由错误:', error)
  res.status(500).json({
    error: error.message || '服务器内部错误'
  })
})

// 定期清理过期任务（48小时）
setInterval(() => {
  const now = Date.now()
  const expireTime = 48 * 60 * 60 * 1000 // 48小时

  for (const [taskId, data] of taskCache.entries()) {
    if (now - data.createdAt > expireTime) {
      taskCache.delete(taskId)
      console.log(`清理过期KIRI任务: ${taskId}`)
    }
  }
}, 60 * 60 * 1000) // 每小时清理一次

module.exports = router
