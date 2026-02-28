/**
 * AR Guidance Component
 * V0.2 (知天下AI) AR引导拍摄界面
 * 
 * 功能：
 * - WebXR场景初始化
 * - 平面检测和物体定位
 * - 环形拍摄轨迹显示
 * - 实时质量反馈
 * - 拍摄点位管理
 */

import { useRef, useState, useEffect } from 'react'
import { useXR, useHitTest } from '@react-three/xr'
import { GlassCard, GlassButton } from '@/components/vision-pro'
import { CaptureRing } from './CaptureRing'
import { QualityIndicator } from './QualityIndicator'
import { ProgressPanel } from './ProgressPanel'
import { cameraService, CapturedPhoto } from '@/services/camera.service'

interface CapturePoint {
  id: string
  position: [number, number, number]
  angle: number
  status: 'pending' | 'captured' | 'current'
  quality?: number
}

interface ARGuidanceProps {
  onPhotoCaptured: (photo: File, metadata: any) => void
  onComplete: (photos: File[]) => void
}

export function ARGuidance({ onPhotoCaptured, onComplete }: ARGuidanceProps) {
  const { isPresenting } = useXR()
  const [anchorPlaced, setAnchorPlaced] = useState(false)
  const [anchorPosition, setAnchorPosition] = useState<[number, number, number]>([0, 0, 0])
  const [capturePoints, setCapturePoints] = useState<CapturePoint[]>([])
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [overallQuality, setOverallQuality] = useState(0)
  const [cameraInitialized, setCameraInitialized] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // 平面检测
  const hitTest = useHitTest((hitMatrix, hit) => {
    if (!anchorPlaced) {
      const position: [number, number, number] = [
        hitMatrix[12],
        hitMatrix[13],
        hitMatrix[14]
      ]
      setAnchorPosition(position)
    }
  })

  // 初始化相机
  useEffect(() => {
    async function initCamera() {
      try {
        setCameraError(null)
        await cameraService.initialize({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        })
        setCameraInitialized(true)
      } catch (error) {
        console.error('相机初始化失败:', error)
        setCameraError(error instanceof Error ? error.message : '相机初始化失败')
      }
    }

    if (isPresenting && !cameraInitialized) {
      initCamera()
    }

    return () => {
      if (cameraInitialized) {
        cameraService.stop()
        setCameraInitialized(false)
      }
    }
  }, [isPresenting, cameraInitialized])

  // 初始化拍摄点位（环形布局）
  useEffect(() => {
    if (anchorPlaced && capturePoints.length === 0) {
      const points = generateCapturePoints(anchorPosition, 8) // 8个拍摄点
      setCapturePoints(points)
    }
  }, [anchorPlaced, anchorPosition])

  // 生成环形拍摄点位
  function generateCapturePoints(
    center: [number, number, number], 
    count: number
  ): CapturePoint[] {
    const radius = 2.5 // 2.5米半径
    const points: CapturePoint[] = []

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = center[0] + Math.cos(angle) * radius
      const z = center[2] + Math.sin(angle) * radius
      
      points.push({
        id: `point_${i}`,
        position: [x, center[1] + 1.6, z], // 1.6米高度（眼睛高度）
        angle: angle * 180 / Math.PI,
        status: i === 0 ? 'current' : 'pending'
      })
    }

    return points
  }

  // 放置锚点
  function placeAnchor() {
    setAnchorPlaced(true)
  }

  // 拍照
  async function capturePhoto() {
    if (!cameraInitialized) {
      setCameraError('相机未初始化')
      return
    }

    const currentPoint = capturePoints[currentPointIndex]
    
    try {
      // 使用真实的相机API拍照
      const capturedPhoto = await cameraService.capturePhoto({
        quality: 0.9,
        format: 'jpeg'
      })

      // 更新点位状态
      setCapturePoints(prev => prev.map((point, idx) => ({
        ...point,
        status: idx === currentPointIndex ? 'captured' as const :
                idx === currentPointIndex + 1 ? 'current' as const :
                point.status,
        quality: idx === currentPointIndex ? capturedPhoto.quality : point.quality
      })))

      // 保存照片
      setCapturedPhotos(prev => [...prev, capturedPhoto])
      
      // 回调
      onPhotoCaptured(capturedPhoto.blob as File, {
        pointId: currentPoint.id,
        position: currentPoint.position,
        angle: currentPoint.angle,
        quality: capturedPhoto.quality,
        metadata: capturedPhoto.metadata
      })

      // 移动到下一个点位
      if (currentPointIndex < capturePoints.length - 1) {
        setCurrentPointIndex(currentPointIndex + 1)
      } else {
        // 完成拍摄
        const photoFiles = capturedPhotos.map(photo => photo.blob as File)
        onComplete([...photoFiles, capturedPhoto.blob as File])
      }

    } catch (error) {
      console.error('拍照失败:', error)
      setCameraError(error instanceof Error ? error.message : '拍照失败')
    }
  }

  // 计算整体质量
  useEffect(() => {
    const capturedPoints = capturePoints.filter(p => p.quality !== undefined)
    if (capturedPoints.length > 0) {
      const avgQuality = capturedPoints.reduce((sum, p) => sum + (p.quality || 0), 0) / capturedPoints.length
      setOverallQuality(avgQuality)
    }
  }, [capturePoints])

  if (!isPresenting) {
    return (
      <GlassCard className="p-6">
        <p className="text-center">请进入AR模式开始拍摄</p>
      </GlassCard>
    )
  }

  // 相机错误处理
  if (cameraError) {
    return (
      <GlassCard className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">📷</div>
          <h3 className="text-lg font-semibold mb-2">相机访问失败</h3>
          <p className="text-gray-400 mb-4">{cameraError}</p>
          <GlassButton 
            onClick={() => {
              setCameraError(null)
              setCameraInitialized(false)
            }}
          >
            重试
          </GlassButton>
        </div>
      </GlassCard>
    )
  }

  // 相机初始化中
  if (!cameraInitialized) {
    return (
      <GlassCard className="p-6">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-4">📷</div>
          <p className="text-gray-400">正在初始化相机...</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <>
      {/* AR场景组件 */}
      {anchorPlaced && (
        <>
          <CaptureRing
            center={anchorPosition}
            capturePoints={capturePoints}
            currentIndex={currentPointIndex}
          />
          
          <QualityIndicator
            currentQuality={capturePoints[currentPointIndex]?.quality}
            overallQuality={overallQuality}
          />
        </>
      )}

      {/* UI覆盖层 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {!anchorPlaced ? (
            // 放置锚点提示
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <GlassButton onClick={placeAnchor} size="lg">
                点击放置拍摄中心
              </GlassButton>
            </div>
          ) : (
            // 拍摄控制
            <>
              <ProgressPanel
                total={capturePoints.length}
                captured={capturedPhotos.length}
                currentIndex={currentPointIndex}
              />
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <GlassButton 
                  onClick={capturePhoto} 
                  size="lg"
                  disabled={currentPointIndex >= capturePoints.length}
                >
                  {currentPointIndex < capturePoints.length ? '拍照' : '完成'}
                </GlassButton>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
