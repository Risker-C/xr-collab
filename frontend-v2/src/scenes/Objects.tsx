import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { CanvasTexture, Vector3 } from 'three'
import { useObjectInteraction } from './useObjectInteraction'
import { usePhysics } from './Physics'
import { useSceneStore } from './sceneStore'
import { appendCurvePoint, drawCurveSegment } from './whiteboardUtils'
import type { SceneObject, SceneObjectType, WhiteboardPoint } from './types'

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

function SceneObjectMesh({ object }: { object: SceneObject }) {
  const meshRef = useRef<Mesh>(null)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const updateObject = useSceneStore((state) => state.updateObject)
  const setSelectedObject = useSceneStore((state) => state.setSelectedObject)
  const physics = usePhysics()

  const handlers = useObjectInteraction({
    onSelect: (id) => setSelectedObject(id),
    onDragStart: (id) => physics.setKinematic(id, true),
    onDrag: (id, position) => {
      updateObject(id, { position })
      physics.setPosition(id, position)
    },
    onDragEnd: (id, { shouldThrow }) => {
      physics.setKinematic(id, false)
      if (shouldThrow) {
        physics.applyImpulse(id, [0, 4, -6])
      }
    },
  }).bindHandlers(object.id)

  const selected = selectedObjectId === object.id

  useEffect(() => {
    if (!meshRef.current) return

    meshRef.current.position.set(object.position[0], object.position[1], object.position[2])
    meshRef.current.rotation.set(object.rotation[0], object.rotation[1], object.rotation[2])
    meshRef.current.scale.set(object.scale[0], object.scale[1], object.scale[2])
  }, [object.position, object.rotation, object.scale])

  useEffect(() => {
    if (!meshRef.current) return

    physics.registerObject(object, meshRef.current)
    return () => {
      physics.unregisterObject(object.id)
    }
  }, [object.id, object.type, physics])

  return (
    <mesh ref={meshRef} castShadow receiveShadow {...handlers}>
      {object.type === 'cube' && <boxGeometry args={[0.5, 0.5, 0.5]} />}
      {object.type === 'sphere' && <sphereGeometry args={[0.25, 24, 24]} />}
      {object.type === 'cylinder' && <cylinderGeometry args={[0.2, 0.2, 0.5, 24]} />}
      {object.type === 'torus' && <torusGeometry args={[0.25, 0.08, 16, 40]} />}
      {object.type === 'pyramid' && <coneGeometry args={[0.3, 0.5, 4]} />}

      <meshStandardMaterial
        color={object.color}
        metalness={0.3}
        roughness={0.6}
        emissive={selected ? '#666600' : '#000000'}
      />
    </mesh>
  )
}

function WhiteboardPlane() {
  const addWhiteboardStroke = useSceneStore((state) => state.addWhiteboardStroke)

  const drawingRef = useRef(false)
  const pointsRef = useRef<WhiteboardPoint[]>([])

  const board = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to create whiteboard context')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    return {
      canvas,
      context,
      texture: new CanvasTexture(canvas),
    }
  }, [])

  useEffect(() => {
    return () => {
      board.texture.dispose()
    }
  }, [board.texture])

  return (
    <mesh
      position={[0, 1.8, -4]}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (!event.uv) return

        const point = { x: event.uv.x, y: 1 - event.uv.y }
        pointsRef.current = [point]
        drawingRef.current = true
        ;(event.target as Element).setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!drawingRef.current || !event.uv) return

        const nextPoint = { x: event.uv.x, y: 1 - event.uv.y }
        const nextPoints = appendCurvePoint(pointsRef.current, nextPoint)

        if (nextPoints.length === pointsRef.current.length) return

        const from = nextPoints[nextPoints.length - 2]
        const to = nextPoints[nextPoints.length - 1]

        drawCurveSegment(board.context, from, to, board.canvas.width, board.canvas.height, '#ef4444', 4)
        board.texture.needsUpdate = true
        pointsRef.current = nextPoints
      }}
      onPointerUp={(event) => {
        if (!drawingRef.current) return

        drawingRef.current = false
        ;(event.target as Element).releasePointerCapture(event.pointerId)

        if (pointsRef.current.length < 2) return

        addWhiteboardStroke({
          id: `stroke_${Date.now()}`,
          points: pointsRef.current,
          color: '#ef4444',
          width: 4,
          timestamp: Date.now(),
        })
      }}
    >
      <planeGeometry args={[4, 2.5]} />
      <meshStandardMaterial map={board.texture} roughness={0.2} metalness={0} />
    </mesh>
  )
}

export function Objects() {
  const camera = useThree((state) => state.camera)

  const objects = useSceneStore((state) => state.objects)
  const addObject = useSceneStore((state) => state.addObject)
  const removeObject = useSceneStore((state) => state.removeObject)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const clearObjects = useSceneStore((state) => state.clearObjects)

  useEffect(() => {
    const spawnObject = (type: SceneObjectType) => {
      const direction = new Vector3()
      camera.getWorldDirection(direction)

      const spawn = camera.position.clone().add(direction.multiplyScalar(2))
      spawn.y = Math.max(1.2, camera.position.y - 0.6)

      addObject(type, [spawn.x, spawn.y, spawn.z])
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return

      switch (event.code) {
        case 'Digit1':
          spawnObject('cube')
          break
        case 'Digit2':
          spawnObject('sphere')
          break
        case 'Digit3':
          spawnObject('cylinder')
          break
        case 'Digit4':
          spawnObject('torus')
          break
        case 'Digit5':
          spawnObject('pyramid')
          break
        case 'Delete':
          if (event.shiftKey) {
            clearObjects()
          } else if (selectedObjectId) {
            removeObject(selectedObjectId)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [addObject, camera, clearObjects, removeObject, selectedObjectId])

  return (
    <>
      {objects.map((object) => (
        <SceneObjectMesh key={object.id} object={object} />
      ))}
      <WhiteboardPlane />
    </>
  )
}
