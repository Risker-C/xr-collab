/**
 * Solution Selector Component
 * 三种方案统一选择界面
 * 
 * V0.3 (ML_Sharp) → V0.2 (知天下AI) → V0.1 (KIRI)
 * 渐进式升级，成本对比，质量对比
 */

import { useState } from 'react'
import { GlassCard, GlassButton } from '@/components/vision-pro'

type SolutionType = 'ml_sharp' | 'zhitianxia' | 'kiri'

interface Solution {
  id: SolutionType
  version: string
  name: string
  description: string
  cost: string
  time: string
  quality: number // 1-5
  features: string[]
  bestFor: string[]
  limitations: string[]
  icon: string
}

export function SolutionSelector({ onSelect }: { onSelect: (solution: SolutionType) => void }) {
  const [selected, setSelected] = useState<SolutionType | null>(null)

  const solutions: Solution[] = [
    {
      id: 'ml_sharp',
      version: 'V0.3',
      name: 'ML_Sharp 快速预览',
      description: '单图AI生成，2秒出结果',
      cost: '$0',
      time: '< 5秒',
      quality: 2,
      features: [
        '单张照片即可',
        '即时生成',
        '完全免费',
        'AI环境识别',
        '拍摄路径建议'
      ],
      bestFor: [
        '快速预览',
        '概念验证',
        '初步规划',
        '拍摄指导'
      ],
      limitations: [
        '质量较低',
        '细节缺失',
        '仅适合预览'
      ],
      icon: '⚡'
    },
    {
      id: 'zhitianxia',
      version: 'V0.2',
      name: '知天下AI 高质量重建',
      description: 'AR引导拍摄，专业重建',
      cost: '$0',
      time: '5-10分钟',
      quality: 4,
      features: [
        'AR引导拍摄',
        '批量照片处理',
        '完全免费',
        '自动质量检测',
        'SOG格式输出'
      ],
      bestFor: [
        '室内空间扫描',
        '家居设计',
        '房产展示',
        '虚拟导览'
      ],
      limitations: [
        '需要20-50张照片',
        '处理时间较长',
        '需要AR设备'
      ],
      icon: '🎯'
    },
    {
      id: 'kiri',
      version: 'V0.1',
      name: 'KIRI Engine 专业级',
      description: '电影级质量，专家优化',
      cost: '$5-50',
      time: '30-180分钟',
      quality: 5,
      features: [
        '超高精度网格',
        '8K纹理贴图',
        '专家手动优化',
        '完整拓扑重建',
        '多格式输出'
      ],
      bestFor: [
        '专业制作',
        '3D打印',
        '游戏资产',
        '电影特效',
        '建筑可视化'
      ],
      limitations: [
        '需要付费',
        '处理时间长',
        '需要大量照片'
      ],
      icon: '👑'
    }
  ]

  function handleSelect(id: SolutionType) {
    setSelected(id)
  }

  function handleConfirm() {
    if (selected) {
      onSelect(selected)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">选择重建方案</h2>
        <p className="text-gray-400">
          从快速预览到专业级质量，选择最适合您的方案
        </p>
      </div>

      {/* 方案卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {solutions.map((solution) => (
          <GlassCard
            key={solution.id}
            className={`p-6 cursor-pointer transition-all ${
              selected === solution.id
                ? 'ring-2 ring-blue-500 scale-105'
                : 'hover:scale-102'
            }`}
            onClick={() => handleSelect(solution.id)}
          >
            {/* 头部 */}
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">{solution.icon}</div>
              <div className="text-xs text-gray-500 mb-1">{solution.version}</div>
              <h3 className="text-xl font-bold mb-1">{solution.name}</h3>
              <p className="text-sm text-gray-400">{solution.description}</p>
            </div>

            {/* 价格和时间 */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-400">成本</div>
                <div className="text-lg font-bold text-green-500">{solution.cost}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">时间</div>
                <div className="text-lg font-bold text-blue-500">{solution.time}</div>
              </div>
            </div>

            {/* 质量评分 */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">质量等级</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-xl ${
                      star <= solution.quality ? 'text-yellow-500' : 'text-gray-600'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* 功能特性 */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">功能特性</div>
              <ul className="space-y-1">
                {solution.features.map((feature, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 适用场景 */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">适用场景</div>
              <div className="flex flex-wrap gap-2">
                {solution.bestFor.map((use, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded"
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>

            {/* 限制说明 */}
            <div>
              <div className="text-xs text-gray-400 mb-2">注意事项</div>
              <ul className="space-y-1">
                {solution.limitations.map((limitation, index) => (
                  <li key={index} className="text-xs text-gray-500 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 渐进式升级提示 */}
      <GlassCard className="p-6 bg-blue-900/20">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h4 className="font-semibold mb-2">推荐流程</h4>
            <p className="text-sm text-gray-400 mb-3">
              建议先使用V0.3快速预览，确认效果后再选择V0.2或V0.1进行高质量重建
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-gray-800 rounded">V0.3 预览</span>
              <span className="text-gray-500">→</span>
              <span className="px-3 py-1 bg-gray-800 rounded">V0.2 重建</span>
              <span className="text-gray-500">→</span>
              <span className="px-3 py-1 bg-gray-800 rounded">V0.1 专业</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 确认按钮 */}
      {selected && (
        <div className="flex justify-center">
          <GlassButton onClick={handleConfirm} size="lg">
            开始使用 {solutions.find(s => s.id === selected)?.name}
          </GlassButton>
        </div>
      )}
    </div>
  )
}