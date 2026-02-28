/**
 * Camera Service
 * 真实的相机API集成
 * 
 * 功能：
 * - 获取相机权限
 * - 拍摄照片
 * - 照片质量检测
 * - 批量拍摄管理
 */

export interface CameraCapabilities {
  facingMode: 'user' | 'environment'
  resolution: {
    width: number
    height: number
  }
  zoom?: {
    min: number
    max: number
    current: number
  }
  flash?: boolean
  focusMode?: 'auto' | 'manual'
}

export interface PhotoMetadata {
  timestamp: number
  location?: {
    latitude: number
    longitude: number
  }
  deviceInfo: {
    userAgent: string
    platform: string
  }
  cameraSettings: {
    resolution: string
    facingMode: string
    flash: boolean
  }
}

export interface CapturedPhoto {
  id: string
  blob: Blob
  dataUrl: string
  metadata: PhotoMetadata
  quality: number
}

export class CameraService {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null

  constructor() {
    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')
  }

  /**
   * 请求相机权限并初始化
   */
  async initialize(constraints: MediaStreamConstraints = {}): Promise<CameraCapabilities> {
    try {
      // 默认约束：后置摄像头，高分辨率
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        audio: false
      }

      const finalConstraints = {
        ...defaultConstraints,
        ...constraints
      }

      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints)

      // 创建video元素用于预览
      this.video = document.createElement('video')
      this.video.srcObject = this.stream
      this.video.autoplay = true
      this.video.playsInline = true

      // 等待视频加载
      await new Promise((resolve) => {
        this.video!.onloadedmetadata = resolve
      })

      // 获取实际的相机能力
      const track = this.stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      const settings = track.getSettings()

      return {
        facingMode: settings.facingMode as 'user' | 'environment',
        resolution: {
          width: settings.width || 1920,
          height: settings.height || 1080
        },
        zoom: capabilities.zoom ? {
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          current: settings.zoom || 1
        } : undefined,
        flash: 'torch' in capabilities,
        focusMode: capabilities.focusMode ? 'auto' : undefined
      }

    } catch (error) {
      console.error('相机初始化失败:', error)
      throw new Error(`相机访问失败: ${error.message}`)
    }
  }

  /**
   * 拍摄照片
   */
  async capturePhoto(options: {
    quality?: number
    format?: 'jpeg' | 'png' | 'webp'
    flash?: boolean
  } = {}): Promise<CapturedPhoto> {
    if (!this.video || !this.canvas || !this.context || !this.stream) {
      throw new Error('相机未初始化')
    }

    const {
      quality = 0.9,
      format = 'jpeg',
      flash = false
    } = options

    try {
      // 开启闪光灯
      if (flash) {
        await this.setFlash(true)
      }

      // 设置canvas尺寸
      this.canvas.width = this.video.videoWidth
      this.canvas.height = this.video.videoHeight

      // 绘制当前帧到canvas
      this.context.drawImage(this.video, 0, 0)

      // 关闭闪光灯
      if (flash) {
        await this.setFlash(false)
      }

      // 转换为Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        this.canvas!.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('照片生成失败'))
          }
        }, `image/${format}`, quality)
      })

      // 生成DataURL用于预览
      const dataUrl = this.canvas.toDataURL(`image/${format}`, quality)

      // 获取位置信息（如果可用）
      const location = await this.getCurrentLocation().catch(() => undefined)

      // 生成照片元数据
      const metadata: PhotoMetadata = {
        timestamp: Date.now(),
        location,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        },
        cameraSettings: {
          resolution: `${this.canvas.width}x${this.canvas.height}`,
          facingMode: this.getCurrentFacingMode(),
          flash
        }
      }

      // 评估照片质量
      const photoQuality = await this.evaluatePhotoQuality(this.canvas)

      const capturedPhoto: CapturedPhoto = {
        id: crypto.randomUUID(),
        blob,
        dataUrl,
        metadata,
        quality: photoQuality
      }

      return capturedPhoto

    } catch (error) {
      console.error('拍照失败:', error)
      throw new Error(`拍照失败: ${error.message}`)
    }
  }

  /**
   * 批量拍摄（用于AR引导拍摄）
   */
  async captureBatch(
    count: number,
    interval: number = 1000,
    onProgress?: (current: number, total: number, photo: CapturedPhoto) => void
  ): Promise<CapturedPhoto[]> {
    const photos: CapturedPhoto[] = []

    for (let i = 0; i < count; i++) {
      try {
        const photo = await this.capturePhoto()
        photos.push(photo)

        if (onProgress) {
          onProgress(i + 1, count, photo)
        }

        // 等待间隔时间（除了最后一张）
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, interval))
        }

      } catch (error) {
        console.error(`第${i + 1}张照片拍摄失败:`, error)
        // 继续拍摄其他照片
      }
    }

    return photos
  }

  /**
   * 设置闪光灯
   */
  private async setFlash(enabled: boolean): Promise<void> {
    if (!this.stream) return

    const track = this.stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities()

    if ('torch' in capabilities) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: enabled } as any]
        })
      } catch (error) {
        console.warn('闪光灯控制失败:', error)
      }
    }
  }

  /**
   * 获取当前相机方向
   */
  private getCurrentFacingMode(): string {
    if (!this.stream) return 'unknown'

    const track = this.stream.getVideoTracks()[0]
    const settings = track.getSettings()
    return settings.facingMode || 'unknown'
  }

  /**
   * 获取当前位置
   */
  private async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('地理位置不支持'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    })
  }

  /**
   * 评估照片质量
   */
  private async evaluatePhotoQuality(canvas: HTMLCanvasElement): Promise<number> {
    const context = canvas.getContext('2d')
    if (!context) return 0.5

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    let brightness = 0
    let contrast = 0
    let sharpness = 0

    // 计算亮度
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      brightness += (r + g + b) / 3
    }
    brightness /= (data.length / 4)

    // 亮度评分 (0-1)
    const brightnessScore = Math.max(0, Math.min(1, 1 - Math.abs(brightness - 128) / 128))

    // 简单的对比度检测
    let minBrightness = 255
    let maxBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const pixelBrightness = (r + g + b) / 3
      minBrightness = Math.min(minBrightness, pixelBrightness)
      maxBrightness = Math.max(maxBrightness, pixelBrightness)
    }
    const contrastScore = Math.min(1, (maxBrightness - minBrightness) / 255)

    // 简单的清晰度检测（边缘检测）
    let edgeCount = 0
    const width = canvas.width
    const height = canvas.height

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4
        const current = (data[i] + data[i + 1] + data[i + 2]) / 3
        const right = (data[i + 4] + data[i + 5] + data[i + 6]) / 3
        const bottom = (data[i + width * 4] + data[i + width * 4 + 1] + data[i + width * 4 + 2]) / 3

        if (Math.abs(current - right) > 30 || Math.abs(current - bottom) > 30) {
          edgeCount++
        }
      }
    }
    const sharpnessScore = Math.min(1, edgeCount / (width * height * 0.1))

    // 综合评分
    const overallQuality = (brightnessScore * 0.3 + contrastScore * 0.3 + sharpnessScore * 0.4)
    return Math.max(0.1, Math.min(1, overallQuality))
  }

  /**
   * 切换相机（前置/后置）
   */
  async switchCamera(): Promise<CameraCapabilities> {
    const currentFacingMode = this.getCurrentFacingMode()
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'

    // 停止当前流
    this.stop()

    // 重新初始化
    return this.initialize({
      video: {
        facingMode: newFacingMode,
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 }
      }
    })
  }

  /**
   * 获取预览视频元素
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.video
  }

  /**
   * 检查相机支持
   */
  static async checkSupport(): Promise<{
    supported: boolean
    cameras: MediaDeviceInfo[]
    permissions: PermissionState
  }> {
    try {
      // 检查基础支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          supported: false,
          cameras: [],
          permissions: 'denied'
        }
      }

      // 获取设备列表
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')

      // 检查权限
      let permissions: PermissionState = 'prompt'
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
        permissions = permissionStatus.state
      } catch (e) {
        // 某些浏览器不支持权限查询
      }

      return {
        supported: cameras.length > 0,
        cameras,
        permissions
      }

    } catch (error) {
      console.error('相机支持检查失败:', error)
      return {
        supported: false,
        cameras: [],
        permissions: 'denied'
      }
    }
  }

  /**
   * 停止相机
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
      this.video = null
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop()
    this.canvas = null
    this.context = null
  }
}

// 导出单例实例
export const cameraService = new CameraService()

// 便捷的hook
export function useCameraService() {
  return cameraService
}