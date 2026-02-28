export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-6">关于 XR Collab</h1>
          <p className="text-xl text-gray-300">
            下一代WebXR协作平台，重新定义3D内容创作和协作体验
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">🎯 项目愿景</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                XR Collab致力于打造一个无缝的WebXR协作生态系统，让用户能够在虚拟现实环境中进行实时协作，
                同时提供强大的AI驱动3D扫描重建能力。
              </p>
              <p>
                我们相信未来的工作和创作将在3D空间中进行，XR Collab正是为这个未来而构建的平台。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">⚡ 核心特性</h2>
            <div className="space-y-3">
              {[
                { icon: '🥽', title: 'WebXR协作', desc: '支持VR/AR设备的实时多人协作' },
                { icon: '📸', title: 'AI 3D扫描', desc: '多种AI引擎支持的3D重建' },
                { icon: '🔄', title: '实时同步', desc: '毫秒级的协作状态同步' },
                { icon: '🌐', title: '跨平台', desc: '支持桌面、移动和VR设备' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <h3 className="text-white font-medium">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-8 rounded-2xl border border-white/10 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">🛠️ 技术架构</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">⚛️</div>
              <h3 className="text-white font-medium mb-2">前端</h3>
              <p className="text-gray-400 text-sm">Next.js 14 + TypeScript + Three.js</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="text-white font-medium mb-2">后端</h3>
              <p className="text-gray-400 text-sm">Node.js + Socket.IO + Express</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-white font-medium mb-2">AI引擎</h3>
              <p className="text-gray-400 text-sm">ML_Sharp + 知天下AI + KIRI</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-6">🚀 开始体验</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/vr"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              进入VR协作
            </a>
            <a
              href="/scan"
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              开始3D扫描
            </a>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-400">
          <p>© 2026 XR Collab. 使用现代化技术构建，为未来而设计。</p>
        </div>
      </div>
    </div>
  )
}