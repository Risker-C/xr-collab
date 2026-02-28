import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-white mb-6">
          XR Collab
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          下一代WebXR协作平台，支持VR实时协作和AI驱动的3D扫描重建
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Link href="/vr" className="group">
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group-hover:scale-105">
            <div className="text-4xl mb-4">🥽</div>
            <h2 className="text-2xl font-bold text-white mb-4">VR协作空间</h2>
            <p className="text-gray-300 mb-6">
              进入沉浸式VR环境，与团队成员实时协作，共同创建和编辑3D内容
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">实时同步</span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">多人协作</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">WebXR</span>
            </div>
          </div>
        </Link>

        <Link href="/scan" className="group">
          <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group-hover:scale-105">
            <div className="text-4xl mb-4">📸</div>
            <h2 className="text-2xl font-bold text-white mb-4">3D扫描重建</h2>
            <p className="text-gray-300 mb-6">
              使用AI技术将照片转换为高质量3D模型，支持多种扫描方案
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">ML_Sharp</span>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm">知天下AI</span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">KIRI Engine</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="text-center mt-16">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-gray-300">系统运行正常</span>
        </div>
      </div>
    </div>
  )
}