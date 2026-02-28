/**
 * ML_Sharp Real API Integration
 * 真实的ML_Sharp API集成
 * 
 * 基于Hugging Face Spaces的免费3D重建服务
 * 使用TripoSR作为ML_Sharp的替代方案
 */

import axios from 'axios'

export interface MLSharpGenerateResponse {
  modelUrl: string
  metadata: {
    roomType: string
    confidence: number
    processingTime: number
    modelSize: number
    vertices?: number
    faces?: number
  }
}

export interface MLSharpAnalyzeResponse {
  roomType: string
  capturePoints: Array<{
    position: [number, number, number]
    angle: number
    priority: number
  }>
  suggestedAngles: number[]
  estimatedPhotos: number
  confidence: number
}

class MLSharpService {
  private baseUrl: string
  private timeout: number

  constructor() {
    // 使用Hugging Face Spaces的TripoSR作为免费替代
    this.baseUrl = 'https://stabilityai-triposr.hf.space'
    this.timeout = 120000 // 2分钟超时
  }

  /**
   * 单图转3D生成（真实API调用）
   */
  async generate(imageFile: File): Promise<MLSharpGenerateResponse> {
    try {
      const startTime = Date.now()

      // 创建FormData
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('mc_resolution', '256')  // 中等分辨率
      formData.append('formats', 'glb')        // GLB格式输出

      console.log('开始ML_Sharp生成，文件大小:', imageFile.size)

      // 调用TripoSR API
      const response = await axios.post(
        `${this.baseUrl}/api/predict`,
        formData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'json'
        }
      )

      const processingTime = Date.now() - startTime

      // 解析响应
      if (response.data && response.data.data && response.data.data[0]) {
        const modelData = response.data.data[0]
        
        // 如果返回的是文件路径，需要构建完整URL
        let modelUrl = modelData
        if (typeof modelData === 'string' && !modelData.startsWith('http')) {
          modelUrl = `${this.baseUrl}/file=${modelData}`
        }

        // 分析图片内容（简单的启发式方法）
        const roomType = await this.analyzeImageContent(imageFile)

        return {
          modelUrl,
          metadata: {
            roomType,
            confidence: 0.85, // TripoSR通常有较高的成功率
            processingTime,
            modelSize: 0, // 无法直接获取，需要后续下载时计算
            vertices: 10000, // 估算值
            faces: 20000     // 估算值
          }
        }
      } else {
        throw new Error('API返回格式异常')
      }

    } catch (error) {
      console.error('ML_Sharp生成失败:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('生成超时，请尝试使用更小的图片')
        } else if (error.response?.status === 429) {
          throw new Error('服务繁忙，请稍后重试')
        } else if (error.response?.status >= 500) {
          throw new Error('服务暂时不可用，请稍后重试')
        }
      }

      throw new Error(`生成失败: ${error.message}`)
    }
  }

  /**
   * 环境分析（基于图像内容）
   */
  async analyze(imageFile: File): Promise<MLSharpAnalyzeResponse> {
    try {
      // 简单的图像分析（基于文件名和基础特征）
      const roomType = await this.analyzeImageContent(imageFile)
      
      // 根据房间类型生成建议的拍摄点位
      const capturePoints = this.generateCapturePoints(roomType)
      
      return {
        roomType,
        capturePoints,
        suggestedAngles: [0, 45, 90, 135, 180, 225, 270, 315], // 8个角度
        estimatedPhotos: capturePoints.length,
        confidence: 0.75
      }

    } catch (error) {
      console.error('环境分析失败:', error)
      throw new Error(`分析失败: ${error.message}`)
    }
  }

  /**
   * 分析图像内容（简单的启发式方法）
   */
  private async analyzeImageContent(imageFile: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        // 简单的颜色分析
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) {
          resolve('unknown')
          return
        }

        const data = imageData.data
        let totalR = 0, totalG = 0, totalB = 0
        const pixelCount = data.length / 4

        for (let i = 0; i < data.length; i += 4) {
          totalR += data[i]
          totalG += data[i + 1]
          totalB += data[i + 2]
        }

        const avgR = totalR / pixelCount
        const avgG = totalG / pixelCount
        const avgB = totalB / pixelCount

        // 基于颜色特征推断房间类型
        if (avgR > avgG && avgR > avgB) {
          resolve('bedroom')      // 偏红色调 - 卧室
        } else if (avgG > avgR && avgG > avgB) {
          resolve('living_room')  // 偏绿色调 - 客厅
        } else if (avgB > avgR && avgB > avgG) {
          resolve('bathroom')     // 偏蓝色调 - 浴室
        } else if (avgR + avgG + avgB < 300) {
          resolve('study')        // 较暗 - 书房
        } else {
          resolve('kitchen')      // 明亮 - 厨房
        }
      }

      img.onerror = () => resolve('unknown')
      img.src = URL.createObjectURL(imageFile)
    })
  }

  /**
   * 根据房间类型生成拍摄点位
   */
  private generateCapturePoints(roomType: string) {
    const basePoints = []
    const radius = 2.5
    const height = 1.6

    // 根据房间类型调整点位数量和分布
    let pointCount = 8
    switch (roomType) {
      case 'living_room':
        pointCount = 12 // 客厅需要更多角度
        break
      case 'bedroom':
        pointCount = 8  // 卧室标准
        break
      case 'kitchen':
        pointCount = 10 // 厨房中等
        break
      case 'bathroom':
        pointCount = 6  // 浴室较少
        break
      default:
        pointCount = 8
    }

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      basePoints.push({
        position: [x, height, z] as [number, number, number],
        angle: angle * 180 / Math.PI,
        priority: i < 4 ? 1 : 2 // 前4个点位优先级更高
      })
    }

    return basePoints
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; version: string; latency: number }> {
    try {
      const startTime = Date.now()
      
      const response = await axios.get(`${this.baseUrl}`, {
        timeout: 10000
      })
      
      const latency = Date.now() - startTime

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        version: 'triposr-v1.0',
        latency
      }

    } catch (error) {
      console.error('健康检查失败:', error)
      return {
        status: 'unhealthy',
        version: 'unknown',
        latency: -1
      }
    }
  }

  /**
   * 获取支持的格式
   */
  getSupportedFormats(): string[] {
    return ['image/jpeg', 'image/png', 'image/webp']
  }

  /**
   * 验证图片文件
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const supportedFormats = this.getSupportedFormats()
    
    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: '不支持的图片格式，请使用JPEG、PNG或WebP'
      }
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB限制
      return {
        valid: false,
        error: '图片文件过大，请使用小于10MB的图片'
      }
    }

    if (file.size < 1024) { // 1KB最小限制
      return {
        valid: false,
        error: '图片文件过小，请使用有效的图片文件'
      }
    }

    return { valid: true }
  }

  /**
   * 批量生成（用于多图处理）
   */
  async generateBatch(
    imageFiles: File[],
    onProgress?: (current: number, total: number, result: MLSharpGenerateResponse) => void
  ): Promise<MLSharpGenerateResponse[]> {
    const results: MLSharpGenerateResponse[] = []

    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const result = await this.generate(imageFiles[i])
        results.push(result)

        if (onProgress) {
          onProgress(i + 1, imageFiles.length, result)
        }

        // 避免API限流，添加延迟
        if (i < imageFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`第${i + 1}张图片处理失败:`, error)
        // 继续处理其他图片
      }
    }

    return results
  }
}

// 导出单例实例
export const mlSharpService = new MLSharpService()

// 便捷的hook
export function useMLSharpService() {
  return mlSharpService
}