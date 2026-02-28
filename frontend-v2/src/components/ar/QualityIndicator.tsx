/**
 * Quality Indicator Component
 * 实时质量反馈指示器
 */

import { GlassCard } from '@/components/vision-pro'

interface QualityIndicatorProps {
  currentQuality?: number
  overallQuality: number
}

export function QualityIndicator({ currentQuality, overallQuality }: QualityIndicatorProps) {
  function getQualityColor(quality: number): string {
    if (quality >= 0.8) return 'text-green-500'
    if (quality >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  function getQualityLabel(quality: number): string {
    if (quality >= 0.8) return '优秀'
    if (quality >= 0.6) return '良好'
    return '需改进'
  }

  return (
    <div className="fixed top-4 right-4 pointer-events-none">
      <GlassCard className="p-4 space-y-2">
        {currentQuality !== undefined && (
          <div>
            <div className="text-sm text-gray-400">当前质量</div>
            <div className={`text-2xl font-bold ${getQualityColor(currentQuality)}`}>
              {Math.round(currentQuality * 100)}%
            </div>
            <div className="text-xs text-gray-500">
              {getQualityLabel(currentQuality)}
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-700 pt-2">
          <div className="text-sm text-gray-400">整体质量</div>
          <div className={`text-xl font-bold ${getQualityColor(overallQuality)}`}>
            {Math.round(overallQuality * 100)}%
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

/**
 * Progress Panel Component
 * 拍摄进度面板
 */

interface ProgressPanelProps {
  total: number
  captured: number
  currentIndex: number
}

export function ProgressPanel({ total, captured, currentIndex }: ProgressPanelProps) {
  const progress = (captured / total) * 100

  return (
    <div className="fixed top-4 left-4 pointer-events-none">
      <GlassCard className="p-4 space-y-3">
        <div>
          <div className="text-sm text-gray-400 mb-1">拍摄进度</div>
          <div className="text-2xl font-bold">
            {captured} / {total}
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="w-48">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Math.round(progress)}% 完成
          </div>
        </div>
        
        {/* 当前点位 */}
        <div className="text-sm">
          <span className="text-gray-400">当前点位：</span>
          <span className="text-white font-semibold">#{currentIndex + 1}</span>
        </div>
      </GlassCard>
    </div>
  )
}