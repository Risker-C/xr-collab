/**
 * KIRI Engine Service
 * V0.1 专业级3D扫描服务
 * 
 * 功能：
 * - 高精度扫描数据上传
 * - 按需付费处理
 * - 质量等级选择
 * - 专业级模型输出
 */

export interface KIRIQualityLevel {
  id: 'standard' | 'premium' | 'ultra'
  name: string
  description: string
  price: number // USD
  processingTime: number // minutes
  maxPhotos: number
  outputFormats: string[]
  features: string[]
}

export interface KIRIUploadResponse {
  taskId: string
  estimatedCost: number
  estimatedTime: number
  qualityLevel: string
}

export interface KIRITaskStatus {
  taskId: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  modelUrl?: string
  cost: number
  processingTime?: number
  metadata?: {
    vertices: number
    faces: number
    textures: number
    fileSize: number
  }
}

export class KIRIService {
  private baseUrl: string

  constructor(baseUrl: string = '/api/kiri') {
    this.baseUrl = baseUrl
  }

  /**
   * 获取质量等级选项
   */
  getQualityLevels(): KIRIQualityLevel[] {
    return [
      {
        id: 'standard',
        name: '标准质量',
        description: '适合一般展示和预览',
        price: 5.0,
        processingTime: 30,
        maxPhotos: 50,
        outputFormats: ['glb', 'obj'],
        features: ['基础网格优化', '标准纹理', '自动修复']
      },
      {
        id: 'premium',
        name: '高级质量',
        description: '适合专业应用和打印',
        price: 15.0,
        processingTime: 60,
        maxPhotos: 100,
        outputFormats: ['glb', 'obj', 'ply', 'fbx'],
        features: ['高精度网格', '4K纹理', '手动优化', '拓扑重建']
      },
      {
        id: 'ultra',
        name: '超高质量',
        description: '电影级质量，适合专业制作',
        price: 50.0,
        processingTime: 180,
        maxPhotos: 200,
        outputFormats: ['glb', 'obj', 'ply', 'fbx', 'usd'],
        features: ['超高精度网格', '8K纹理', '专家手动优化', '完整拓扑重建', '材质分离']
      }
    ]
  }

  /**
   * 上传扫描数据
   */
  async uploadScanData(
    photos: File[], 
    qualityLevel: KIRIQualityLevel['id'],
    options?: {
      notes?: string
      priority?: boolean
      outputFormats?: string[]
    }
  ): Promise<KIRIUploadResponse> {
    const formData = new FormData()
    
    // 添加照片
    photos.forEach((photo, index) => {
      formData.append('photos', photo, `photo_${index}.jpg`)
    })

    // 添加配置
    formData.append('qualityLevel', qualityLevel)
    if (options?.notes) formData.append('notes', options.notes)
    if (options?.priority) formData.append('priority', 'true')
    if (options?.outputFormats) {
      formData.append('outputFormats', JSON.stringify(options.outputFormats))
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '上传失败' }))
      throw new Error(error.message || '上传失败')
    }

    return response.json()
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<KIRITaskStatus> {
    const response = await fetch(`${this.baseUrl}/task/${taskId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '查询失败' }))
      throw new Error(error.message || '查询失败')
    }

    return response.json()
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '取消失败' }))
      throw new Error(error.message || '取消失败')
    }
  }

  /**
   * 估算成本
   */
  estimateCost(photoCount: number, qualityLevel: KIRIQualityLevel['id']): number {
    const levels = this.getQualityLevels()
    const level = levels.find(l => l.id === qualityLevel)
    
    if (!level) return 0

    // 基础价格 + 照片数量加成
    const photoMultiplier = Math.max(1, photoCount / 20) // 每20张照片为基准
    return level.price * photoMultiplier
  }

  /**
   * 估算处理时间
   */
  estimateProcessingTime(photoCount: number, qualityLevel: KIRIQualityLevel['id']): number {
    const levels = this.getQualityLevels()
    const level = levels.find(l => l.id === qualityLevel)
    
    if (!level) return 0

    // 基础时间 + 照片数量加成
    const photoMultiplier = Math.max(1, photoCount / 30) // 每30张照片为基准
    return Math.round(level.processingTime * photoMultiplier)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`)
    
    if (!response.ok) {
      throw new Error('服务不可用')
    }

    return response.json()
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['image/jpeg', 'image/png', 'image/tiff', 'image/raw']
  }

  /**
   * 验证照片集合
   */
  validatePhotoSet(photos: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const supportedFormats = this.getSupportedFormats()

    if (photos.length < 10) {
      errors.push('至少需要10张照片')
    }

    if (photos.length > 200) {
      errors.push('最多支持200张照片')
    }

    photos.forEach((photo, index) => {
      if (!supportedFormats.includes(photo.type)) {
        errors.push(`照片 ${index + 1} 格式不支持`)
      }

      if (photo.size > 50 * 1024 * 1024) { // 50MB
        errors.push(`照片 ${index + 1} 文件过大`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// 导出单例实例
export const kiriService = new KIRIService()

// 便捷的hook
export function useKIRIService() {
  return kiriService
}