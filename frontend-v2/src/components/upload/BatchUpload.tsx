/**
 * Batch Upload Component
 * V0.2 (知天下AI) 批量照片上传
 * 
 * 功能：
 * - 批量文件选择和拖拽
 * - 照片质量评分
 * - 自动筛选和排序
 * - 上传进度管理
 * - 预览和编辑
 */

import { useState, useCallback } from 'react'
import { GlassButton, GlassCard } from '@/components/vision-pro'
import { useModelStore } from '@/store/models.store'

interface PhotoFile {
  id: string
  file: File
  preview: string
  quality: number
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  metadata?: {
    width: number
    height: number
    size: number
    timestamp: number
  }
}

export function BatchUpload() {
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const addModel = useModelStore(state => state.addModel)

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList) => {
    const newPhotos: PhotoFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      const preview = await readFileAsDataURL(file)
      const metadata = await getImageMetadata(file)
      const quality = await evaluateImageQuality(file, metadata)

      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        preview,
        quality,
        status: 'pending',
        progress: 0,
        metadata
      })
    }

    // 按质量排序（高质量优先）
    newPhotos.sort((a, b) => b.quality - a.quality)

    setPhotos(prev => [...prev, ...newPhotos])
  }, [])

  // 读取文件为DataURL
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 获取图片元数据
  function getImageMetadata(file: File): Promise<{
    width: number
    height: number
    size: number
    timestamp: number
  }> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          timestamp: file.lastModified
        })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // 评估图片质量
  async function evaluateImageQuality(
    file: File,
    metadata: { width: number; height: number; size: number }
  ): Promise<number> {
    let score = 1.0

    // 分辨率评分
    const resolution = metadata.width * metadata.height
    if (resolution < 1920 * 1080) score -= 0.3
    else if (resolution < 3840 * 2160) score -= 0.1

    // 文件大小评分（过小可能压缩过度）
    const bytesPerPixel = metadata.size / resolution
    if (bytesPerPixel < 0.5) score -= 0.2

    // TODO: 使用Canvas分析模糊度、曝光等

    return Math.max(0, Math.min(1, score))
  }

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // 移除照片
  function removePhoto(id: string) {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  // 批量上传
  async function uploadPhotos() {
    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      photos.forEach(photo => {
        formData.append('photos', photo.file)
      })

      // 调用知天下AI API
      const response = await fetch('/api/zhitianxia/reconstruct', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const { taskId } = await response.json()

      // 轮询任务状态
      await pollTaskStatus(taskId)

      setUploading(false)
      setProgress(100)

    } catch (error) {
      console.error('上传失败:', error)
      setUploading(false)
      alert(error instanceof Error ? error.message : '上传失败')
    }
  }

  // 轮询任务状态
  async function pollTaskStatus(taskId: string) {
    const maxAttempts = 60 // 最多轮询10分钟（每10秒一次）
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // 10秒间隔

      const response = await fetch(`/api/zhitianxia/task/${taskId}`)
      const data = await response.json()

      setProgress(data.progress || 0)

      if (data.status === 'completed') {
        // 添加生成的模型
        addModel({
          id: crypto.randomUUID(),
          type: 'zhitianxia',
          format: 'glb',
          url: data.modelUrl,
          metadata: {
            source: 'zhitianxia_v0.2',
            quality: 'standard',
            created_at: new Date().toISOString(),
            photo_count: photos.length
          }
        })
        return
      }

      if (data.status === 'failed') {
        throw new Error(data.error || '处理失败')
      }

      attempts++
    }

    throw new Error('处理超时')
  }

  // 计算整体质量
  const averageQuality = photos.length > 0
    ? photos.reduce((sum, p) => sum + p.quality, 0) / photos.length
    : 0

  // 筛选低质量照片
  const lowQualityPhotos = photos.filter(p => p.quality < 0.6)

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold mb-4">批量上传照片</h2>

      {/* 拖拽区域 */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">拖拽照片到这里</p>
          <p className="text-sm mb-4">或点击下方按钮选择文件</p>
          
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) handleFileSelect(e.target.files)
            }}
            className="hidden"
            id="batch-file-input"
          />
          <label htmlFor="batch-file-input">
            <GlassButton as="span" className="cursor-pointer">
              选择照片
            </GlassButton>
          </label>
        </div>
      </div>

      {/* 照片统计 */}
      {photos.length > 0 && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{photos.length}</div>
              <div className="text-sm text-gray-400">总照片数</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.round(averageQuality * 100)}%</div>
              <div className="text-sm text-gray-400">平均质量</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{lowQualityPhotos.length}</div>
              <div className="text-sm text-gray-400">低质量</div>
            </div>
          </div>
        </div>
      )}

      {/* 照片列表 */}
      <div className="grid grid-cols-4 gap-4 mb-4 max-h-96 overflow-y-auto">
        {photos.map(photo => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.preview}
              alt=""
              className="w-full aspect-square object-cover rounded-lg"
            />
            
            {/* 质量标签 */}
            <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${
              photo.quality >= 0.8 ? 'bg-green-500' :
              photo.quality >= 0.6 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              {Math.round(photo.quality * 100)}%
            </div>

            {/* 删除按钮 */}
            <button
              onClick={() => removePhoto(photo.id)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>

            {/* 进度条 */}
            {photo.status === 'uploading' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${photo.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 上传按钮 */}
      {photos.length > 0 && (
        <div className="flex gap-4">
          <GlassButton
            onClick={uploadPhotos}
            disabled={uploading || photos.length < 3}
            className="flex-1"
          >
            {uploading ? `上传中 ${Math.round(progress)}%` : '开始重建'}
          </GlassButton>

          {!uploading && (
            <GlassButton
              onClick={() => setPhotos([])}
              variant="secondary"
            >
              清空
            </GlassButton>
          )}
        </div>
      )}

      {/* 低质量警告 */}
      {lowQualityPhotos.length > 0 && !uploading && (
        <div className="mt-4 p-3 bg-yellow-900/50 text-yellow-200 rounded">
          ⚠️ 检测到 {lowQualityPhotos.length} 张低质量照片，可能影响重建效果
        </div>
      )}
    </GlassCard>
  )
}
