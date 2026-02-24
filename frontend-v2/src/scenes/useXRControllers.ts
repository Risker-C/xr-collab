import { useFrame } from '@react-three/fiber'
import { useXRInputSourceEvent, useXRInputSourceStates } from '@react-three/xr'
import { useMemo, useRef } from 'react'

export interface XRControllerSnapshot {
  connected: number
  isSelecting: boolean
  moveAxes: [number, number]
}

export function useXRControllers() {
  const inputSourceStates = useXRInputSourceStates()
  const selectingRef = useRef(false)
  const moveAxesRef = useRef<[number, number]>([0, 0])

  useXRInputSourceEvent(
    'all',
    'selectstart',
    () => {
      selectingRef.current = true
    },
    [],
  )

  useXRInputSourceEvent(
    'all',
    'selectend',
    () => {
      selectingRef.current = false
    },
    [],
  )

  useFrame(() => {
    const candidate = inputSourceStates.find((state) => state.inputSource.handedness === 'left') ?? inputSourceStates[0]
    const axes = candidate?.inputSource.gamepad?.axes

    if (!axes || axes.length < 2) {
      moveAxesRef.current = [0, 0]
      return
    }

    const x = axes[2] ?? axes[0] ?? 0
    const y = axes[3] ?? axes[1] ?? 0

    moveAxesRef.current = [x, y]
  })

  const snapshot = useMemo<XRControllerSnapshot>(
    () => ({
      connected: inputSourceStates.length,
      isSelecting: selectingRef.current,
      moveAxes: moveAxesRef.current,
    }),
    [inputSourceStates.length],
  )

  return {
    getMoveAxes: () => moveAxesRef.current,
    snapshot,
  }
}
