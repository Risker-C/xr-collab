'use client'

import { useState, useRef } from 'react'
import { BACKEND_URL } from '@/lib/config'

type ScanMethod = 'ml-sharp' | 'zhitianxia' | 'kiri'

interface ScanProgress {
  stage: string
  progress: number
  message: string
}

export default function ScanPage() {
  const [selectedMethod, setSelectedMethod] = useState<ScanMethod>('ml-sharp')
  const [isScanning, setIsScanning] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const methods = [
    {
      id: 'ml-sharp' as ScanMethod,
      name: 'ML_Sharp',
      icon: '⚡',
      description: '单图转3D，60秒快速生成',
      features: ['完全免费', '快速生成', '适合简单物体'],
      maxFiles: 1,
      color: 'from-blue-600/20 to-cyan-600/20',
      borderColor: 'border-blue-500/50',
      acceptedFormats: 'image/jpeg,image/png'
    },
    {
      id: 'zhitianxia' as ScanMethod,
      name: '知天下AI',
      icon: '🎯',
      description: 'AR引导拍摄，批量处理',
      features: ['AR引导', '批量上传', 'SOG输出'],
      maxFiles: 100,
      color: 'from-green-600/20 to-teal-600/20',
      borderColor: 'border-green-500/50',
      acceptedFormats: 'image/jpeg,image/png'
    },
    {
      id: 'kiri' as ScanMethod,
      name: 'KIRI Engine',
      icon: '👑',
      description: '专业级质量，付费服务',
      features: ['高精度', '专业质量', '多种输出格式'],
      maxFiles: 200,
      color: 'from-purple-600/20 to-pink-600/20',
      borderColor: 'border-purple-500/50',
      acceptedFormats: 'image/jpeg,image/png'
    }
  ]

  const currentMethod = methods.find(m => m.id === selectedMethod)!

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.slice(0, currentMethod.maxFiles)
    setUploadedFiles(validFiles)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    const validFiles = files
      .filter(f => f.type.startsWith('image/'))
      .slice(0, currentMethod.maxFiles)
    setUploadedFiles(validFiles)
  }

  const handleStartScan = async () => {
    if (uploadedFiles.length === 0) return

    setIsScanning(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage('')
    setScanProgress({ stage: '上传中', progress: 0, message: '正在上传图片...' })

    const formData = new FormData()
    uploadedFiles.forEach(file => formData.append('images', file))
    formData.append('method', selectedMethod)

    try {
      const result = await new Promise<{ modelUrl?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100
            setUploadProgress(percent)
          }
        }

        xhr.upload.onload = () => {
          setUploadStatus('processing')
          setScanProgress({ stage: '处理中', progress: 90, message: '图片上传完成，正在生成3D模型...' })
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve(data)
            } catch (parseError) {
              reject(new Error('响应解析失败'))
            }
          } else {
            reject(new Error(xhr.responseText || '扫描失败'))
          }
        }

        xhr.onerror = () => {
          reject(new Error('上传失败，请重试'))
        }

        xhr.open('POST', `${BACKEND_URL}/api/${selectedMethod}/scan`)
        xhr.send(formData)
      })

      setUploadStatus('complete')
      setScanProgress({ stage: '完成', progress: 100, message: '3D模型已生成' })
      setModelUrl(result.modelUrl ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : '扫描失败，请重试'
      console.error('Scan error:', error)
      setUploadStatus('error')
      setErrorMessage(message)
      setScanProgress({ stage: '失败', progress: 0, message })
    } finally {
      setIsScanning(false)
    }
  }

  const resetScan = () => {
    setUploadedFiles([])
    setScanProgress(null)
    setModelUrl(null)
    setUploadProgress(0)
    setUploadStatus('idle')
    setErrorMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">3D扫描重建</h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          选择适合您需求的扫描方案，从快速原型到专业级重建
        </p>
      </div>

      {/* 方案选择 */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => {
              setSelectedMethod(method.id)
              resetScan()
            }}
            aria-label={`${method.name}扫描方案`}
            aria-pressed={selectedMethod === method.id}
            disabled={isScanning}
            className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedMethod === method.id
                ? `bg-gradient-to-br ${method.color} ${method.borderColor} scale-105`
                : 'bg-gray-900/50 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="text-4xl mb-4">{method.icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{method.name}</h3>
            <p className="text-gray-300 text-sm mb-4">{method.description}</p>
            <div className="space-y-2">
              {method.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-green-400">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* 扫描界面 */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900/50 p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">
            {currentMethod.name} 扫描
          </h2>

          {!modelUrl && (
            <div className="space-y-6">
              {/* 文件上传 */}
              <div>
                <label className="block text-gray-300 mb-2">
                  上传图片 
                  {currentMethod.maxFiles > 1 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (最多{currentMethod.maxFiles}张)
                    </span>
                  )}
                </label>
                <div 
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer"
                  role="button"
                  aria-label="点击或拖拽上传图片"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={currentMethod.acceptedFormats}
                    multiple={currentMethod.maxFiles > 1}
                    aria-label="选择要扫描的图片"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-4xl mb-2">📁</div>
                  {uploadedFiles.length === 0 ? (
                    <>
                      <p className="text-gray-400">点击或拖拽图片到此处</p>
                      <p className="text-gray-500 text-sm mt-2">
                        {selectedMethod === 'ml-sharp' && '支持单张图片'}
                        {selectedMethod === 'zhitianxia' && '支持批量上传，最多100张'}
                        {selectedMethod === 'kiri' && '支持多角度拍摄，最多200张'}
                      </p>
                    </>
                  ) : (
                    <div className="text-gray-300">
                      <p className="font-medium">已选择 {uploadedFiles.length} 张图片</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          resetScan()
                        }}
                        aria-label="清除已选择图片"
                        className="mt-2 text-sm text-red-400 hover:text-red-300"
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {uploadStatus === 'uploading' && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {/* 进度条 */}
              {scanProgress && uploadStatus !== 'uploading' && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>{scanProgress.stage}</span>
                    <span>{scanProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{scanProgress.message}</p>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="text-sm text-red-400">{errorMessage}</div>
              )}

              {/* 开始扫描按钮 */}
              <button
                onClick={handleStartScan}
                aria-label="开始3D扫描"
                disabled={isScanning || uploadedFiles.length === 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    处理中...
                  </span>
                ) : (
                  '开始扫描'
                )}
              </button>
            </div>
          )}

          {/* 扫描结果 */}
          {modelUrl && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <span className="text-2xl">✓</span>
                  <span className="font-medium">扫描完成！</span>
                </div>
                <p className="text-gray-300 text-sm">3D模型已成功生成</p>
              </div>

              <div className="flex gap-3">
                <a
                  href={modelUrl}
                  download
                  aria-label="下载生成的3D模型"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center transition-colors"
                >
                  下载模型
                </a>
                <button
                  onClick={resetScan}
                  aria-label="重新扫描"
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  重新扫描
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="mt-8 p-6 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <h3 className="text-white font-medium mb-2">💡 扫描提示</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• 确保图片清晰，光线充足</li>
            <li>• 多角度拍摄可提高重建质量</li>
            <li>• 避免反光和透明物体</li>
            <li>• 保持相机稳定，避免模糊</li>
          </ul>
        </div>
      </div>
    </div>
  )
}