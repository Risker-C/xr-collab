import { useCallback, useEffect, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

export interface DesktopInputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

export interface MoveIntent {
  x: number
  z: number
}

const ZERO_INTENT: MoveIntent = { x: 0, z: 0 }

const UP = new Vector3(0, 1, 0)

export function computeMoveIntent(state: DesktopInputState): MoveIntent {
  const x = Number(state.right) - Number(state.left)
  const z = Number(state.backward) - Number(state.forward)

  if (x === 0 && z === 0) return ZERO_INTENT

  const length = Math.hypot(x, z)
  return {
    x: x / length,
    z: z / length,
  }
}

export function computeWorldDeltaFromIntent(
  intent: MoveIntent,
  cameraQuaternion: Quaternion,
  deltaSeconds: number,
  speed: number,
): Vector3 {
  if (intent.x === 0 && intent.z === 0) return new Vector3()

  const forward = new Vector3(0, 0, -1).applyQuaternion(cameraQuaternion)
  forward.y = 0
  forward.normalize()

  const right = new Vector3().crossVectors(forward, UP).normalize()

  return new Vector3()
    .addScaledVector(right, intent.x)
    .addScaledVector(forward, -intent.z)
    .multiplyScalar(speed * deltaSeconds)
}

export function useDesktopControls() {
  const keysRef = useRef<DesktopInputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keysRef.current.forward = true
          break
        case 'KeyS':
          keysRef.current.backward = true
          break
        case 'KeyA':
          keysRef.current.left = true
          break
        case 'KeyD':
          keysRef.current.right = true
          break
        default:
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keysRef.current.forward = false
          break
        case 'KeyS':
          keysRef.current.backward = false
          break
        case 'KeyA':
          keysRef.current.left = false
          break
        case 'KeyD':
          keysRef.current.right = false
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const getMoveIntent = useCallback(() => computeMoveIntent(keysRef.current), [])

  return {
    getMoveIntent,
  }
}
