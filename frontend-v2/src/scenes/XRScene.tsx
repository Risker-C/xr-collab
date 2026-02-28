import { AdaptiveDpr, PerformanceMonitor, type PerformanceMonitorApi } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { XR, XROrigin } from '@react-three/xr'
import { Suspense, useCallback, useRef, useState } from 'react'
import type { Group } from 'three'
import { ModelViewer } from '../components/3d/ModelViewer'
import { useModelStore } from '../store/models.store'
import { DOMOverlay } from '../xr/DOMOverlay'
import { useXRProvider } from '../xr/xrContext'
import { BasicShapes } from './BasicShapes'
import { VRControls } from './VRControls'

export function XRScene() {
  const { store } = useXRProvider()
  const originRef = useRef<Group>(null)
  const models = useModelStore((state) => state.models)

  const [dpr, setDpr] = useState(1.25)
  const [perfSnapshot, setPerfSnapshot] = useState({ fps: 60, factor: 0.5 })
  const lastPerfUpdateRef = useRef(0)

  const handlePerformanceChange = useCallback((api: PerformanceMonitorApi) => {
    const now = performance.now()
    if (now - lastPerfUpdateRef.current < 250) {
      return
    }

    lastPerfUpdateRef.current = now

    const nextDpr = Number((0.8 + api.factor * 1.2).toFixed(2))
    setDpr((prev) => (Math.abs(prev - nextDpr) > 0.05 ? nextDpr : prev))

    setPerfSnapshot((prev) => {
      const next = {
        fps: Math.round(api.fps),
        factor: Number(api.factor.toFixed(2)),
      }

      return prev.fps === next.fps && prev.factor === next.factor ? prev : next
    })
  }, [])

  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.1, far: 160, position: [0, 1.6, 4.5] }}
    >
      <PerformanceMonitor onChange={handlePerformanceChange} onFallback={() => setDpr(0.8)} />
      <AdaptiveDpr pixelated />

      <XR store={store}>
        <XROrigin ref={originRef} position={[0, 0, 0]}>
          <VRControls originRef={originRef} />

          <ambientLight intensity={0.55} />
          <directionalLight
            castShadow
            intensity={1}
            position={[5, 8, 4]}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ isGround: true }}>
            <planeGeometry args={[120, 120]} />
            <meshStandardMaterial color="#0f172a" roughness={0.95} metalness={0.02} />
          </mesh>

          <gridHelper args={[120, 120, '#1f3b5c', '#1f3b5c']} position={[0, 0.01, 0]} />

          <Suspense fallback={null}>
            <BasicShapes qualityFactor={perfSnapshot.factor} />
            
            {/* 渲染所有已生成的3D模型 */}
            {models.map((model, index) => (
              <ModelViewer
                key={model.id}
                url={model.url}
                position={[index * 2 - models.length, 0, 0]} // 水平排列
                scale={1}
                onLoad={() => console.log(`模型 ${model.id} 加载完成`)}
                onError={(error) => console.error(`模型 ${model.id} 加载失败:`, error)}
              />
            ))}
          </Suspense>
        </XROrigin>

        <DOMOverlay fps={perfSnapshot.fps} dpr={dpr} />
      </XR>
    </Canvas>
  )
}
