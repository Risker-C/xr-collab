/**
 * ML_Sharp API Routes
 * V0.3 (ML_Sharp) 的API端点
 * 
 * 路由：
 * POST /api/ml-sharp/generate - 单图转3D生成
 * POST /api/ml-sharp/analyze - 环境识别分析
 * GET /api/ml-sharp/health - 健康检查
 */

const express = require('express')
const multer = require('multer')
const MLSharpWorker = require('../ml-sharp-worker')
const { presets: rateLimitPresets } = require('../rate-limiter')

const router = express.Router()

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片文件'), false)
    }
  }
})

// 创建Worker实例
const mlSharpWorker = new MLSharpWorker()

/**
 * POST /api/ml-sharp/generate
 * 单图转3D生成
 * 应用严格的速率限制（10次/10分钟）
 */
router.post('/generate', rateLimitPresets.generation, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '请上传图片文件'
      })
    }

    console.log(`开始处理图片: ${req.file.originalname}, 大小: ${req.file.size} bytes`)

    const result = await mlSharpWorker.generate(
      req.file.buffer,
      req.file.originalname
    )

    console.log('生成成功:', result.metadata)

    res.json({
      success: true,
      modelUrl: result.modelUrl,
      metadata: result.metadata
    })

  } catch (error) {
    console.error('生成失败:', error)
    res.status(500).json({
      error: error.message || '生成失败'
    })
  }
})

/**
 * POST /api/ml-sharp/analyze
 * 环境识别和分析
 * 应用标准速率限制（60次/分钟）
 */
router.post('/analyze', rateLimitPresets.standard, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '请上传图片文件'
      })
    }

    console.log(`开始分析图片: ${req.file.originalname}`)

    const result = await mlSharpWorker.analyzeEnvironment(
      req.file.buffer,
      req.file.originalname
    )

    console.log('分析完成:', result)

    res.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('分析失败:', error)
    res.status(500).json({
      error: error.message || '分析失败'
    })
  }
})

/**
 * GET /api/ml-sharp/health
 * 健康检查
 * 应用宽松速率限制（120次/分钟）
 */
router.get('/health', rateLimitPresets.relaxed, async (req, res) => {
  try {
    const health = await mlSharpWorker.healthCheck()
    
    res.json({
      service: 'ml-sharp',
      timestamp: new Date().toISOString(),
      modal: health
    })

  } catch (error) {
    console.error('健康检查失败:', error)
    res.status(503).json({
      service: 'ml-sharp',
      timestamp: new Date().toISOString(),
      error: error.message,
      modal: {
        status: 'error',
        version: '0.0.0'
      }
    })
  }
})

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: '文件过大，最大支持10MB'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: '只能上传一个文件'
      })
    }
  }

  console.error('ML_Sharp路由错误:', error)
  res.status(500).json({
    error: error.message || '服务器内部错误'
  })
})

module.exports = router