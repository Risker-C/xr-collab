import { Canvas } from '@react-three/fiber'
import { XR, XROrigin, createXRStore } from '@react-three/xr'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'
import { CameraRig } from './CameraRig'
import { Environment } from './Environment'
import { Objects } from './Objects'
import { Physics } from './Physics'
import { useSceneStore } from './sceneStore'

export const xrStore = createXRStore({
  frameRate: 'high',
  foveation: 0.5,
})

export function XRScene() {
  const originRef = useRef<Group>(null)
  const setLocalPose = useSceneStore((state) => state.setLocalPose)

  return (
    <Canvas
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1.6, 5] }}
      dpr={[1, 2]}
    >
      <XR store={xrStore}>
        <XROrigin ref={originRef} position={[0, 0, 0]}>
          <CameraRig originRef={originRef} onPoseSync={setLocalPose} />
        </XROrigin>

        <Physics>
          <Environment />
          <Suspense fallback={null}>
            <Objects />
          </Suspense>
        </Physics>
      </XR>
    </Canvas>
  )
}
