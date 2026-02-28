/**
 * Quality Comparison Component
 * 三种方案质量对比展示
 * 
 * 功能：
 * - 并排展示不同方案的结果
 * - 质量指标对比
 * - 成本效益分析
 * - 升级建议
 */

import { useState } from 'react'
import { GlassCard, GlassButton } from '@/components/vision-pro'
import { ModelViewer } from '@/components/3d/ModelViewer'
import { useModelStore, Model3D } from '@/store/models.store'

interface ComparisonMetrics {
  vertices: number
  faces: number
  textureResolution: string
  fileSize: string
  processingTime: string
  cost: string
  quality: number
}

export function QualityComparison() {
  const models = useModelStore(state => state.models)
  const [selectedModels, setSelectedModels] = useState<{
    ml_sharp?: Model3D
    zhitianxia?: Model3D
    kiri?: Model3D
  }>({})

  // 获取每种类型的最新模型
  const getLatestModel = (type: Model3D['type']) => {
    return models
      .filter(m => m.type === type)
      .sort((a, b) => new Date(b.metadata.created_at).getTime() - new Date(a.metadata.created_at).getTime())[0]
  }

  // 模拟质量指标（实际应从模型元数据获取）
  const getMetrics = (model: Model3D): ComparisonMetrics => {
    const baseMetrics = {
      ml_sharp: {
        vertices: 5000,
        faces: 10000,
        textureResolution: '512x512',
        fileSize: '2.5MB',
        processingTime: '3秒',
        cost: '$0',
        quality: 2
      },
      zhitianxia: {
        vertices: 50000,
        faces: 100000,
        textureResolution: '2048x2048',
        fileSize: '15MB',
        processingTime: '8分钟',
        cost: '$0',
        quality: 4
      },
      kiri: {
        vertices: 200000,
        faces: 400000,
        textureResolution: '4096x4096',
        fileSize: '85MB',
        processingTime: '45分钟',
        cost: '$15',
        quality: 5
      }
    }

    return baseMetrics[model.type] || baseMetrics.ml_sharp
  }

  // 自动选择对比模型
  useState(() => {
    setSelectedModels({
      ml_sharp: getLatestModel('ml_sharp'),
      zhitianxia: getLatestModel('zhitianxia'),
      kiri: getLatestModel('kiri')
    })
  })

  const availableTypes = Object.keys(selectedModels).filter(
    type => selectedModels[type as keyof typeof selectedModels]
  ) as Array<keyof typeof selectedModels>

  if (availableTypes.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">暂无模型对比</h3>
        <p className="text-gray-400">
          请先使用不同方案生成模型，然后返回查看质量对比
        </p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">质量对比</h2>
        <p className="text-gray-400">
          对比不同方案的重建质量和性能指标
        </p>
      </div>

      {/* 3D模型对比 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {availableTypes.map((type) => {
          const model = selectedModels[type]!
          const metrics = getMetrics(model)
          
          return (
            <GlassCard key={type} className="p-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  {type === 'ml_sharp' ? 'V0.3 ML_Sharp' :
                   type === 'zhitianxia' ? 'V0.2 知天下AI' :
                   'V0.1 KIRI Engine'}
                </h3>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= metrics.quality ? 'text-yellow-500' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* 3D预览 */}
              <div className="aspect-square bg-gray-900 rounded-lg mb-4 overflow-hidden">
                <ModelViewer
                  url={model.url}
                  scale={1}
                  onLoad={() => console.log(`${type} 模型加载完成`)}
                  onError={(error) => console.error(`${type} 模型加载失败:`, error)}
                />
              </div>

              {/* 质量指标 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">顶点数</span>
                  <span>{metrics.vertices.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">面数</span>
                  <span>{metrics.faces.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">纹理</span>
                  <span>{metrics.textureResolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">文件大小</span>
                  <span>{metrics.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">处理时间</span>
                  <span>{metrics.processingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">成本</span>
                  <span className={metrics.cost === '$0' ? 'text-green-500' : 'text-yellow-500'}>
                    {metrics.cost}
                  </span>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* 详细对比表格 */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-semibold mb-4">详细对比</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">指标</th>
                {availableTypes.map((type) => (
                  <th key={type} className="text-center py-3 px-4">
                    {type === 'ml_sharp' ? 'V0.3' :
                     type === 'zhitianxia' ? 'V0.2' :
                     'V0.1'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'quality', label: '质量等级', format: (v: number) => '★'.repeat(v) + '☆'.repeat(5-v) },
                { key: 'vertices', label: '顶点数', format: (v: number) => v.toLocaleString() },
                { key: 'faces', label: '面数', format: (v: number) => v.toLocaleString() },
                { key: 'textureResolution', label: '纹理分辨率', format: (v: string) => v },
                { key: 'fileSize', label: '文件大小', format: (v: string) => v },
                { key: 'processingTime', label: '处理时间', format: (v: string) => v },
                { key: 'cost', label: '成本', format: (v: string) => v }
              ].map((row) => (
                <tr key={row.key} className="border-b border-gray-800">
                  <td className="py-3 px-4 text-gray-400">{row.label}</td>
                  {availableTypes.map((type) => {
                    const model = selectedModels[type]!
                    const metrics = getMetrics(model)
                    const value = metrics[row.key as keyof ComparisonMetrics]
                    
                    return (
                      <td key={type} className="py-3 px-4 text-center">
                        {row.format(value as any)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 升级建议 */}
      <GlassCard className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🚀</div>
          <div className="flex-1">
            <h4 className="font-semibold mb-2">升级建议</h4>
            {availableTypes.includes('ml_sharp') && !availableTypes.includes('zhitianxia') && (
              <p className="text-sm text-gray-300 mb-3">
                您当前使用的是V0.3快速预览。建议升级到V0.2获得更高质量的重建效果，完全免费！
              </p>
            )}
            {availableTypes.includes('zhitianxia') && !availableTypes.includes('kiri') && (
              <p className="text-sm text-gray-300 mb-3">
                V0.2已经提供了很好的质量。如需专业级效果（如3D打印、游戏资产），可考虑升级到V0.1。
              </p>
            )}
            {availableTypes.length === 3 && (
              <p className="text-sm text-gray-300 mb-3">
                您已体验了所有三种方案！可以根据具体需求选择最适合的质量等级。
              </p>
            )}
            
            <div className="flex gap-3">
              {!availableTypes.includes('zhitianxia') && (
                <GlassButton size="sm">
                  升级到 V0.2
                </GlassButton>
              )}
              {!availableTypes.includes('kiri') && (
                <GlassButton size="sm" variant="secondary">
                  升级到 V0.1
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}