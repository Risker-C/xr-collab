import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { useRef, type RefObject } from 'react'
import type { Group } from 'three'
import { Vector3 } from 'three'
import { computeWorldDeltaFromIntent, useDesktopControls } from './useDesktopControls'
import { useXRControllers } from './useXRControllers'
import type { PoseSnapshot } from './types'

interface CameraRigProps {
  originRef: RefObject<Group | null>
  onPoseSync: (pose: PoseSnapshot) => void
}

const FORWARD = new Vector3()
const RIGHT = new Vector3()
const UP = new Vector3(0, 1, 0)

export function CameraRig({ originRef, onPoseSync }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const isInXR = useXR((state) => state.session != null)

  const { getMoveIntent } = useDesktopControls()
  const xrControllers = useXRControllers()

  const lastPoseTimeRef = useRef(0)
  const lastPositionRef = useRef(new Vector3())

  useFrame((_, delta) => {
    const origin = originRef.current
    if (!origin) return

    if (!isInXR) {
      const moveIntent = getMoveIntent()
      const worldDelta = computeWorldDeltaFromIntent(moveIntent, camera.quaternion, delta, 4.8)
      origin.position.add(worldDelta)
    } else {
      const [axisX, axisY] = xrControllers.getMoveAxes()

      FORWARD.set(0, 0, -1).applyQuaternion(camera.quaternion)
      FORWARD.y = 0
      FORWARD.normalize()

      RIGHT.crossVectors(FORWARD, UP).normalize()

      origin.position
        .addScaledVector(RIGHT, axisX * delta * 3.8)
        .addScaledVector(FORWARD, axisY * delta * 3.8)
    }

    const now = performance.now()
    const moved = lastPositionRef.current.distanceTo(camera.position)

    if (now - lastPoseTimeRef.current >= 80 && moved >= 0.02) {
      onPoseSync({
        position: [camera.position.x, camera.position.y, camera.position.z],
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
        timestamp: Date.now(),
      })

      lastPoseTimeRef.current = now
      lastPositionRef.current.copy(camera.position)
    }
  })

  return <PointerLockControls enabled={!isInXR} selector="#root" />
}
