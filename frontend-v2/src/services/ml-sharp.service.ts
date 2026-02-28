/**
 * ML_Sharp Service
 * V0.3 API客户端
 * 
 * 功能：
 * - 单图转3D生成
 * - 环境识别和分析
 * - 拍摄路径建议
 */

export interface MLSharpGenerateResponse {
  modelUrl: string
  metadata: {
    roomType: string
    confidence: number
    processingTime: number
    modelSize: number
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

export class MLSharpService {
  private baseUrl: string

  constructor(baseUrl: string = '/api/ml-sharp') {
    this.baseUrl = baseUrl
  }

  /**
   * 单图转3D生成
   */
  async generateFrom3D(imageFile: File): Promise<MLSharpGenerateResponse> {
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '生成失败' }))
      throw new Error(error.message || '生成失败')
    }

    return response.json()
  }

  /**
   * 环境识别和分析
   * 为V0.2 AR引导拍摄提供路径建议
   */
  async analyzeEnvironment(imageFile: File): Promise<MLSharpAnalyzeResponse> {
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '分析失败' }))
      throw new Error(error.message || '分析失败')
    }

    return response.json()
  }

  /**
   * 计算环形拍摄路径
   * 基于分析结果生成更详细的坐标点
   */
  calculateCircularPath(
    center: [number, number, number],
    radius: number,
    pointsCount: number
  ): Array<{ position: [number, number, number]; angle: number }> {
    const path = []
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2
      const x = center[0] + Math.cos(angle) * radius
      const z = center[2] + Math.sin(angle) * radius
      path.push({
        position: [x, center[1], z] as [number, number, number],
        angle: (angle * 180) / Math.PI
      })
    }
    return path
  }

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`)
    
    if (!response.ok) {
      throw new Error('服务不可用')
    }

    return response.json()
  }

  /**
   * 获取支持的图片格式
   */
  getSupportedFormats(): string[] {
    return ['image/jpeg', 'image/png', 'image/webp']
  }

  /**
   * 验证图片文件
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const supportedFormats = this.getSupportedFormats()

    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的格式。支持：${supportedFormats.join(', ')}`
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件过大。最大支持 ${maxSize / 1024 / 1024}MB`
      }
    }

    return { valid: true }
  }
}

// 导出单例实例
export const mlSharpService = new MLSharpService()

// 便捷的hook
export function useMLSharpService() {
  return mlSharpService
}
