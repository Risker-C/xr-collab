/**
 * ML_Sharp Worker Bridge
 * 连接Modal推理服务的桥接层
 * 
 * 功能：
 * - 转发图片到Modal推理服务
 * - 处理推理结果
 * - 错误处理和重试
 * - 健康检查
 */

const axios = require('axios')
const FormData = require('form-data')

class MLSharpWorker {
  constructor() {
    this.modalEndpoint = process.env.MODAL_ENDPOINT || 'https://modal.com/api'
    this.apiKey = process.env.MODAL_API_KEY
    this.timeout = 60000 // 60秒超时
    this.maxRetries = 3
  }

  /**
   * 单图转3D生成
   */
  async generate(imageBuffer, filename) {
    if (!this.apiKey) {
      throw new Error('Modal API key未配置')
    }

    const formData = new FormData()
    formData.append('image', imageBuffer, filename)

    try {
      const response = await this._requestWithRetry(
        `${this.modalEndpoint}/ml-sharp/generate`,
        formData
      )

      return {
        modelUrl: response.data.modelUrl,
        metadata: {
          roomType: response.data.roomType || 'unknown',
          confidence: response.data.confidence || 0,
          processingTime: response.data.processingTime || 0,
          modelSize: response.data.modelSize || 0
        }
      }
    } catch (error) {
      console.error('ML_Sharp生成失败:', error)
      throw new Error(`生成失败: ${error.message}`)
    }
  }

  /**
   * 环境识别和分析
   */
  async analyzeEnvironment(imageBuffer, filename) {
    if (!this.apiKey) {
      throw new Error('Modal API key未配置')
    }

    const formData = new FormData()
    formData.append('image', imageBuffer, filename)

    try {
      const response = await this._requestWithRetry(
        `${this.modalEndpoint}/ml-sharp/analyze`,
        formData
      )

      return {
        roomType: response.data.roomType || 'unknown',
        capturePoints: response.data.capturePoints || [],
        suggestedAngles: response.data.suggestedAngles || [],
        estimatedPhotos: response.data.estimatedPhotos || 20,
        confidence: response.data.confidence || 0
      }
    } catch (error) {
      console.error('环境分析失败:', error)
      throw new Error(`分析失败: ${error.message}`)
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.modalEndpoint}/health`,
        {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        status: response.data.status || 'unknown',
        version: response.data.version || '0.0.0'
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
   * 带重试的请求
   */
  async _requestWithRetry(url, formData, retries = 0) {
    try {
      const response = await axios.post(url, formData, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      })

      return response
    } catch (error) {
      if (retries < this.maxRetries && this._isRetryableError(error)) {
        console.log(`重试 ${retries + 1}/${this.maxRetries}...`)
        await this._delay(1000 * (retries + 1)) // 指数退避
        return this._requestWithRetry(url, formData, retries + 1)
      }

      throw error
    }
  }

  /**
   * 判断是否可重试的错误
   */
  _isRetryableError(error) {
    if (!error.response) return true // 网络错误
    const status = error.response.status
    return status === 429 || status === 503 || status >= 500
  }

  /**
   * 延迟函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = MLSharpWorker
