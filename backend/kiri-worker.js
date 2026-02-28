/**
 * KIRI Engine Worker Bridge
 * V0.1 专业级3D扫描后端集成
 * 
 * 功能：
 * - 高精度扫描数据上传
 * - 按需付费处理
 * - 质量等级管理
 * - 专业级模型输出
 */

const axios = require('axios')
const FormData = require('form-data')

class KIRIWorker {
  constructor() {
    this.apiEndpoint = process.env.KIRI_API_ENDPOINT || 'https://api.kiriengine.com'
    this.apiKey = process.env.KIRI_API_KEY
    this.timeout = 600000 // 10分钟超时（大文件上传）
  }

  /**
   * 提交专业级重建任务
   */
  async submitReconstructionTask(photoBuffers, filenames, options = {}) {
    if (!this.apiKey) {
      throw new Error('KIRI Engine API key未配置')
    }

    if (photoBuffers.length < 10) {
      throw new Error('专业级重建至少需要10张照片')
    }

    const {
      qualityLevel = 'standard',
      outputFormats = ['glb'],
      priority = false,
      notes = ''
    } = options

    const formData = new FormData()
    
    // 添加所有照片
    photoBuffers.forEach((buffer, index) => {
      formData.append('photos', buffer, filenames[index] || `photo_${index}.jpg`)
    })

    // 添加配置参数
    formData.append('qualityLevel', qualityLevel) // standard | premium | ultra
    formData.append('outputFormats', JSON.stringify(outputFormats))
    formData.append('priority', priority.toString())
    formData.append('optimize', 'true')
    formData.append('autoRepair', 'true')
    
    if (notes) formData.append('notes', notes)

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/v2/reconstruct`,
        formData,
        {
          timeout: this.timeout,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Client': 'xr-collab-v0.1',
            ...formData.getHeaders()
          }
        }
      )

      return {
        taskId: response.data.taskId,
        estimatedCost: response.data.estimatedCost,
        estimatedTime: response.data.estimatedTime || 1800, // 30分钟默认
        qualityLevel: response.data.qualityLevel,
        status: 'processing',
        photoCount: photoBuffers.length
      }
    } catch (error) {
      console.error('KIRI任务提交失败:', error)
      throw new Error(`任务提交失败: ${error.message}`)
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    if (!this.apiKey) {
      throw new Error('KIRI Engine API key未配置')
    }

    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v2/task/${taskId}`,
        {
          timeout: 15000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Client': 'xr-collab-v0.1'
          }
        }
      )

      return {
        taskId: response.data.taskId,
        status: response.data.status, // processing | completed | failed | cancelled
        progress: response.data.progress || 0, // 0-100
        modelUrl: response.data.modelUrl,
        previewUrl: response.data.previewUrl,
        format: response.data.format,
        qualityLevel: response.data.qualityLevel,
        actualCost: response.data.actualCost,
        error: response.data.error,
        metadata: {
          photoCount: response.data.photoCount,
          processingTime: response.data.processingTime,
          modelSize: response.data.modelSize,
          vertices: response.data.vertices,
          faces: response.data.faces,
          textureResolution: response.data.textureResolution,
          optimizations: response.data.optimizations || []
        }
      }
    } catch (error) {
      console.error('查询KIRI任务状态失败:', error)
      throw new Error(`查询失败: ${error.message}`)
    }
  }

  /**
   * 下载专业级模型
   */
  async downloadModel(url, format = 'glb') {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2分钟（大文件）
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': `model/${format}`
        }
      })

      return {
        buffer: response.data,
        contentType: response.headers['content-type'],
        size: response.data.length,
        format: format
      }
    } catch (error) {
      console.error('下载KIRI模型失败:', error)
      throw new Error(`下载失败: ${error.message}`)
    }
  }

  /**
   * 获取质量等级定价
   */
  async getPricing() {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v2/pricing`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return response.data.qualityLevels || []
    } catch (error) {
      console.error('获取KIRI定价失败:', error)
      // 返回默认定价
      return [
        {
          id: 'standard',
          name: '标准质量',
          basePrice: 5.0,
          description: '适合一般展示和预览'
        },
        {
          id: 'premium',
          name: '高级质量',
          basePrice: 15.0,
          description: '适合专业应用和打印'
        },
        {
          id: 'ultra',
          name: '超高质量',
          basePrice: 50.0,
          description: '电影级质量，适合专业制作'
        }
      ]
    }
  }

  /**
   * 估算成本
   */
  async estimateCost(photoCount, qualityLevel) {
    try {
      const response = await axios.post(
        `${this.apiEndpoint}/v2/estimate`,
        {
          photoCount,
          qualityLevel
        },
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        estimatedCost: response.data.estimatedCost,
        estimatedTime: response.data.estimatedTime,
        breakdown: response.data.breakdown || {}
      }
    } catch (error) {
      console.error('KIRI成本估算失败:', error)
      
      // 简单估算逻辑
      const pricing = await this.getPricing()
      const level = pricing.find(p => p.id === qualityLevel)
      const basePrice = level ? level.basePrice : 5.0
      const photoMultiplier = Math.max(1, photoCount / 20)
      
      return {
        estimatedCost: basePrice * photoMultiplier,
        estimatedTime: qualityLevel === 'ultra' ? 180 : 
                      qualityLevel === 'premium' ? 60 : 30,
        breakdown: {
          basePrice,
          photoMultiplier,
          qualityLevel
        }
      }
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    if (!this.apiKey) {
      throw new Error('KIRI Engine API key未配置')
    }

    try {
      await axios.delete(
        `${this.apiEndpoint}/v2/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return { success: true }
    } catch (error) {
      console.error('取消KIRI任务失败:', error)
      throw new Error(`取消失败: ${error.message}`)
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v2/health`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        status: response.data.status || 'unknown',
        version: response.data.version || '2.0.0',
        quota: response.data.quota || {},
        features: response.data.features || []
      }
    } catch (error) {
      return {
        status: 'error',
        version: '2.0.0',
        error: error.message
      }
    }
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo() {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v2/account`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        balance: response.data.balance || 0,
        currency: response.data.currency || 'USD',
        plan: response.data.plan || 'pay-per-use',
        usage: response.data.usage || {},
        limits: response.data.limits || {}
      }
    } catch (error) {
      console.error('获取KIRI账户信息失败:', error)
      throw new Error(`账户查询失败: ${error.message}`)
    }
  }
}

module.exports = KIRIWorker