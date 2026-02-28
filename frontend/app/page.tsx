'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BACKEND_URL } from '@/lib/config'

interface SystemStatus {
  backend: boolean
  database: boolean
  ai_services: {
    ml_sharp: boolean
    zhitianxia: boolean
    kiri: boolean
  }
  uptime: string
  version: string
}

export default function HomePage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`)
        if (response.ok) {
          const status = await response.json()
          setSystemStatus(status)
        } else {
          // 模拟状态
          setSystemStatus({
            backend: false,
            database: false,
            ai_services: {
              ml_sharp: false,
              zhitianxia: false,
              kiri: false
            },
            uptime: '0h 0m',
            version: 'v1.0.0'
          })
        }
      } catch (error) {
        console.error('Status check failed:', error)
        setSystemStatus({
          backend: false,
          database: false,
          ai_services: {
            ml_sharp: false,
            zhitianxia: false,
            kiri: false
          },
          uptime: '0h 0m',
          version: 'v1.0.0'
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // 30秒检查一次

    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      href: '/vr',
      icon: '🥽',
      title: 'VR协作空间',
      description: '进入沉浸式VR环境，与团队成员实时协作，共同创建和编辑3D内容',
      gradient: 'from-blue-600/20 to-purple-600/20',
      tags: ['实时同步', '多人协作', 'WebXR', 'WASD控制'],
      status: systemStatus?.backend
    },
    {
      href: '/scan',
      icon: '📸',
      title: '3D扫描重建',
      description: '使用AI技术将照片转换为高质量3D模型，支持多种扫描方案',
      gradient: 'from-green-600/20 to-teal-600/20',
      tags: ['ML_Sharp', '知天下AI', 'KIRI Engine', '批量处理'],
      status: systemStatus?.ai_services.ml_sharp || systemStatus?.ai_services.zhitianxia || systemStatus?.ai_services.kiri
    }
  ]

  return (
    <div className="container mx-auto px-4 py-16">
      {/* 主标题 */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-white mb-6">
          XR Collab
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
          下一代WebXR协作平台，支持VR实时协作和AI驱动的3D扫描重建
        </p>
        
        {/* 版本信息 */}
        {systemStatus && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700">
            <span className="text-gray-400 text-sm">版本</span>
            <span className="text-white text-sm font-mono">{systemStatus.version}</span>
            <span className="text-gray-400 text-sm">•</span>
            <span className="text-gray-400 text-sm">运行时间</span>
            <span className="text-white text-sm font-mono">{systemStatus.uptime}</span>
          </div>
        )}
      </div>

      {/* 功能卡片 */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group">
            <div className={`bg-gradient-to-br ${feature.gradient} p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group-hover:scale-105 relative overflow-hidden`}>
              {/* 状态指示器 */}
              <div className="absolute top-4 right-4">
                <div className={`w-3 h-3 rounded-full ${feature.status ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              </div>
              
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h2 className="text-2xl font-bold text-white mb-4">{feature.title}</h2>
              <p className="text-gray-300 mb-6">
                {feature.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {feature.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 系统状态面板 */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-gray-900/50 p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">系统状态</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin text-2xl">⚙️</div>
              <span className="ml-2 text-gray-400">检查系统状态...</span>
            </div>
          ) : systemStatus ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* 核心服务 */}
              <div>
                <h4 className="text-white font-medium mb-3">核心服务</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">后端服务</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${systemStatus.backend ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-sm ${systemStatus.backend ? 'text-green-400' : 'text-red-400'}`}>
                        {systemStatus.backend ? '正常' : '离线'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">数据库</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${systemStatus.database ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-sm ${systemStatus.database ? 'text-green-400' : 'text-red-400'}`}>
                        {systemStatus.database ? '正常' : '离线'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI服务 */}
              <div>
                <h4 className="text-white font-medium mb-3">AI服务</h4>
                <div className="space-y-2">
                  {Object.entries(systemStatus.ai_services).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">
                        {service.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className={`text-sm ${status ? 'text-green-400' : 'text-red-400'}`}>
                          {status ? '正常' : '离线'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              无法获取系统状态
            </div>
          )}
        </div>
      </div>

      {/* 快速开始 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-6">🚀 快速开始</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vr"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            进入VR协作
          </Link>
          <Link
            href="/scan"
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            开始3D扫描
          </Link>
          <Link
            href="/about"
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            了解更多
          </Link>
        </div>
      </div>

      {/* 底部状态 */}
      <div className="text-center mt-16">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            systemStatus?.backend ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span className="text-gray-300">
            {systemStatus?.backend ? '系统运行正常' : '系统离线'}
          </span>
        </div>
      </div>
    </div>
  )
}