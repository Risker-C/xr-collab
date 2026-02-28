/**
 * ImageUpload Component
 * V0.3 (ML_Sharp) - 单图上传组件
 * 
 * 功能：
 * - 支持拖拽上传
 * - 支持点击选择文件
 * - 实时预览
 * - 上传进度显示
 * - 调用ML_Sharp API生成3D模型
 */

import { useState, useCallback } from 'react'
import { GlassButton, GlassCard } from '@/components/vision-pro'
import { useModelStore } from '@/store/models.store'

interface UploadState {
  file: File | null
  preview: string | null
  uploading: boolean
  progress: number
  error: string | null
}

export function ImageUpload() {
  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    progress: 0,
    error: null
  })

  const addModel = useModelStore(state => state.addModel)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: '请选择图片文件' }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setState(prev => ({
        ...prev,
        file,
        preview: e.target?.result as string,
        error: null
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!state.file) return

    setState(prev => ({ ...prev, uploading: true, progress: 0 }))

    try {
      const formData = new FormData()
      formData.append('image', state.file)

      // 调用ML_Sharp API
      const response = await fetch('/api/ml-sharp/generate', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('生成失败')
      }

      const { modelUrl, metadata } = await response.json()

      // 添加到模型存储
      addModel({
        id: crypto.randomUUID(),
        type: 'ml_sharp',
        format: 'glb',
        url: modelUrl,
        metadata: {
          source: 'ml_sharp_v0.3',
          quality: 'preview',
          room_type: metadata.roomType || 'unknown',
          created_at: new Date().toISOString()
        }
      })

      setState(prev => ({ ...prev, uploading: false, progress: 100 }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : '上传失败'
      }))
    }
  }

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold mb-4">上传照片生成3D模型</h2>

      {/* 拖拽区域 */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {state.preview ? (
          <img
            src={state.preview}
            alt="预览"
            className="max-w-full max-h-64 mx-auto rounded"
          />
        ) : (
          <div className="text-gray-500">
            <p className="text-lg mb-2">拖拽图片到这里</p>
            <p className="text-sm">或点击下方按钮选择文件</p>
          </div>
        )}
      </div>

      {/* 文件选择 */}
      <div className="mt-4 flex gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input">
          <GlassButton as="span" className="cursor-pointer">
            选择图片
          </GlassButton>
        </label>

        {state.file && (
          <GlassButton
            onClick={handleUpload}
            disabled={state.uploading}
          >
            {state.uploading ? `生成中 ${state.progress}%` : '生成3D模型'}
          </GlassButton>
        )}
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {state.error}
        </div>
      )}

      {/* 进度条 */}
      {state.uploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
    </GlassCard>
  )
}
