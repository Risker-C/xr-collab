import type { ThreeEvent } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import { Plane, Vector3 } from 'three'
import type { Vec3Tuple } from './types'

interface InteractionOptions {
  onSelect?: (id: string | null) => void
  onDragStart?: (id: string) => void
  onDrag?: (id: string, position: Vec3Tuple) => void
  onDragEnd?: (id: string, options: { shouldThrow: boolean }) => void
}

interface ActiveDragState {
  id: string
  pointerId: number
  offset: Vector3
}

const dragPlane = new Plane()
const dragHit = new Vector3()

export function useObjectInteraction(options: InteractionOptions = {}) {
  const activeDrag = useRef<ActiveDragState | null>(null)

  const bindHandlers = useCallback(
    (id: string) => ({
      onPointerDown: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()

        options.onSelect?.(id)

        const targetObject = event.eventObject
        const normal = new Vector3(0, 0, 1).applyQuaternion(event.camera.quaternion).normalize()

        dragPlane.setFromNormalAndCoplanarPoint(normal, targetObject.position)

        const offset = event.point.clone().sub(targetObject.position)
        activeDrag.current = {
          id,
          pointerId: event.pointerId,
          offset,
        }

        ;(event.target as Element).setPointerCapture(event.pointerId)
        options.onDragStart?.(id)
      },
      onPointerMove: (event: ThreeEvent<PointerEvent>) => {
        const drag = activeDrag.current
        if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return

        event.stopPropagation()

        if (!event.ray.intersectPlane(dragPlane, dragHit)) return

        const nextPosition = dragHit.clone().sub(drag.offset)
        options.onDrag?.(id, [nextPosition.x, nextPosition.y, nextPosition.z])
      },
      onPointerUp: (event: ThreeEvent<PointerEvent>) => {
        const drag = activeDrag.current
        if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return

        event.stopPropagation()
        ;(event.target as Element).releasePointerCapture(event.pointerId)

        options.onDragEnd?.(id, {
          shouldThrow: event.nativeEvent.shiftKey,
        })

        activeDrag.current = null
      },
      onPointerMissed: () => {
        options.onSelect?.(null)
      },
    }),
    [options],
  )

  return {
    bindHandlers,
    isDragging: () => activeDrag.current !== null,
  }
}
