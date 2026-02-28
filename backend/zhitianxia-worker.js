/**
 * 知天下AI Worker Bridge
 * V0.2 (知天下AI) API集成
 * 
 * 功能：
 * - 批量照片上传
 * - 3D重建任务提交
 * - 异步任务状态轮询
 * - SOG模型下载和转换
 */

const axios = require('axios')
const FormData = require('form-data')

class ZhiTianXiaWorker {
  constructor() {
    this.apiEndpoint = process.env.ZHITIANXIA_API_ENDPOINT || 'https://api.zhitianxia.ai'
    this.apiKey = process.env.ZHITIANXIA_API_KEY
    this.timeout = 300000 // 5分钟超时（上传大文件）
  }

  /**
   * 提交3D重建任务
   */
  async submitReconstructionTask(photoBuffers, filenames) {
    if (!this.apiKey) {
      throw new Error('知天下AI API key未配置')
    }

    if (photoBuffers.length < 3) {
      throw new Error('至少需要3张照片')
    }

    const formData = new FormData()
    
    // 添加所有照片
    photoBuffers.forEach((buffer, index) => {
      formData.append('photos', buffer, filenames[index] || `photo_${index}.jpg`)
    })

    // 添加配置参数
    formData.append('quality', 'standard') // standard | high | ultra
    formData.append('format', 'sog') // sog | glb
    formData.append('optimize', 'true')

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/v1/reconstruct`,
        formData,
        {
          timeout: this.timeout,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          }
        }
      )

      return {
        taskId: response.data.taskId,
        estimatedTime: response.data.estimatedTime || 300, // 秒
        status: 'processing'
      }
    } catch (error) {
      console.error('知天下AI任务提交失败:', error)
      throw new Error(`任务提交失败: ${error.message}`)
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    if (!this.apiKey) {
      throw new Error('知天下AI API key未配置')
    }

    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v1/task/${taskId}`,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        taskId: response.data.taskId,
        status: response.data.status, // processing | completed | failed
        progress: response.data.progress || 0, // 0-100
        modelUrl: response.data.modelUrl,
        format: response.data.format, // sog | glb
        error: response.data.error,
        metadata: {
          photoCount: response.data.photoCount,
          processingTime: response.data.processingTime,
          modelSize: response.data.modelSize,
          vertices: response.data.vertices,
          faces: response.data.faces
        }
      }
    } catch (error) {
      console.error('查询任务状态失败:', error)
      throw new Error(`查询失败: ${error.message}`)
    }
  }

  /**
   * 下载SOG模型
   */
  async downloadSOGModel(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000 // 1分钟
      })

      return {
        buffer: response.data,
        contentType: response.headers['content-type'],
        size: response.data.length
      }
    } catch (error) {
      console.error('下载SOG模型失败:', error)
      throw new Error(`下载失败: ${error.message}`)
    }
  }

  /**
   * SOG转GLB
   */
  async convertSOGtoGLB(sogBuffer) {
    // TODO: 实现SOG→GLB转换
    // 可能需要使用Python脚本或专门的转换库
    
    // 临时返回原始buffer
    return sogBuffer
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/v1/health`,
        {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        status: response.data.status || 'unknown',
        version: response.data.version || '0.0.0',
        quota: response.data.quota || {}
      }
    } catch (error) {
      return {
        status: 'error',
        version: '0.0.0',
        error: error.message
      }
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    if (!this.apiKey) {
      throw new Error('知天下AI API key未配置')
    }

    try {
      await axios.delete(
        `${this.apiEndpoint}/v1/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return { success: true }
    } catch (error) {
      console.error('取消任务失败:', error)
      throw new Error(`取消失败: ${error.message}`)
    }
  }
}

module.exports = ZhiTianXiaWorker
