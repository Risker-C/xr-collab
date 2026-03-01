import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 移除 turbopack: {} — 生产构建中启用 Turbopack 会导致 Vercel 部署失败
  // 移除 output: 'export' 残留配置 (trailingSlash, images.unoptimized)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource'
    })
    return config
  }
}

export default nextConfig
