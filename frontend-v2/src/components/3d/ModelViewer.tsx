/**
 * ModelViewer Component
 * 动态加载和渲染3D模型（glb/obj/ply）
 * 
 * 支持V0.3/V0.2/V0.1三种方案生成的模型
 */

import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import type { Group } from 'three'

interface ModelViewerProps {
  url: string
  position?: [number, number, number]
  scale?: number
  onLoad?: () => void
  onError?: (error: Error) => void
}

export function ModelViewer({ 
  url, 
  position = [0, 0, 0], 
  scale = 1,
  onLoad,
  onError 
}: ModelViewerProps) {
  const { scene, error } = useGLTF(url, true)

  useEffect(() => {
    if (scene && onLoad) {
      onLoad()
    }
  }, [scene, onLoad])

  useEffect(() => {
    if (error && onError) {
      onError(error as Error)
    }
  }, [error, onError])

  if (error) {
    console.error('模型加载失败:', error)
    return null
  }

  if (!scene) {
    return null
  }

  return (
    <primitive 
      object={scene} 
      position={position} 
      scale={scale}
      castShadow
      receiveShadow
    />
  )
}

// 预加载模型
export function preloadModel(url: string) {
  useGLTF.preload(url)
}
