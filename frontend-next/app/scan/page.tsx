'use client'

import { useState } from 'react'

type ScanMethod = 'ml-sharp' | 'zhitianxia' | 'kiri'

export default function ScanPage() {
  const [selectedMethod, setSelectedMethod] = useState<ScanMethod>('ml-sharp')
  const [isScanning, setIsScanning] = useState(false)

  const methods = [
    {
      id: 'ml-sharp' as ScanMethod,
      name: 'ML_Sharp',
      icon: '⚡',
      description: '单图转3D，60秒快速生成',
      features: ['完全免费', '快速生成', '适合简单物体'],
      color: 'from-blue-600/20 to-cyan-600/20',
      borderColor: 'border-blue-500/50'
    },
    {
      id: 'zhitianxia' as ScanMethod,
      name: '知天下AI',
      icon: '🎯',
      description: 'AR引导拍摄，批量处理',
      features: ['AR引导', '批量上传', 'SOG输出'],
      color: 'from-green-600/20 to-teal-600/20',
      borderColor: 'border-green-500/50'
    },
    {
      id: 'kiri' as ScanMethod,
      name: 'KIRI Engine',
      icon: '👑',
      description: '专业级质量，付费服务',
      features: ['高精度', '专业质量', '多种输出格式'],
      color: 'from-purple-600/20 to-pink-600/20',
      borderColor: 'border-purple-500/50'
    }
  ]

  const handleStartScan = () => {
    setIsScanning(true)
    // TODO: 实现扫描逻辑
    setTimeout(() => setIsScanning(false), 3000)
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">3D扫描重建</h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          选择适合您需求的扫描方案，从快速原型到专业级重建
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => setSelectedMethod(method.id)}
            className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
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

      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900/50 p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">
            {methods.find(m => m.id === selectedMethod)?.name} 扫描
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2">上传图片</label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-400">点击或拖拽图片到此处</p>
                <p className="text-gray-500 text-sm mt-2">
                  {selectedMethod === 'ml-sharp' && '支持单张图片'}
                  {selectedMethod === 'zhitianxia' && '支持批量上传'}
                  {selectedMethod === 'kiri' && '支持多角度拍摄'}
                </p>
              </div>
            </div>

            <button
              onClick={handleStartScan}
              disabled={isScanning}
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
        </div>

        <div className="mt-8 p-6 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <h3 className="text-white font-medium mb-2">💡 提示</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• 确保图片清晰，光线充足</li>
            <li>• 多角度拍摄可提高重建质量</li>
            <li>• 避免反光和透明物体</li>
          </ul>
        </div>
      </div>
    </div>
  )
}