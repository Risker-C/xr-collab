import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { InstancedMesh, Mesh } from 'three'
import { Color, Object3D } from 'three'

interface BasicShapesProps {
  qualityFactor: number
}

function Cube() {
  const ref = useRef<Mesh>(null)
  const [active, setActive] = useState(false)

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) {
      return
    }

    const step = Math.min(delta, 1 / 30)
    mesh.rotation.x += step * 0.55
    mesh.rotation.y += step * 0.85
  })

  return (
    <mesh
      ref={ref}
      castShadow
      position={[-1.25, 1.2, -2.4]}
      scale={active ? 1.25 : 1}
      onClick={(event) => {
        event.stopPropagation()
        setActive((value) => !value)
      }}
    >
      <boxGeometry args={[0.85, 0.85, 0.85]} />
      <meshStandardMaterial color={active ? '#38bdf8' : '#f97316'} roughness={0.45} metalness={0.2} />
    </mesh>
  )
}

function Sphere() {
  const ref = useRef<Mesh>(null)
  const [highlighted, setHighlighted] = useState(false)

  useFrame(({ clock }, delta) => {
    const mesh = ref.current
    if (!mesh) {
      return
    }

    const step = Math.min(delta, 1 / 30)
    mesh.rotation.y += step * 0.7
    mesh.position.y = 1.15 + Math.sin(clock.elapsedTime * 1.4) * 0.22
  })

  return (
    <mesh
      ref={ref}
      castShadow
      position={[1.1, 1.15, -2.8]}
      onPointerOver={() => setHighlighted(true)}
      onPointerOut={() => setHighlighted(false)}
      onClick={(event) => {
        event.stopPropagation()
        setHighlighted((value) => !value)
      }}
    >
      <sphereGeometry args={[0.52, 32, 32]} />
      <meshStandardMaterial color={highlighted ? '#86efac' : '#22c55e'} roughness={0.38} metalness={0.1} />
    </mesh>
  )
}

function InstancedBlocks({ qualityFactor }: { qualityFactor: number }) {
  const count = Math.max(60, Math.floor(220 * Math.max(0.2, qualityFactor)))
  const meshRef = useRef<InstancedMesh>(null)

  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color('#38bdf8'), [])

  const transforms = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const ring = 2.8 + (index % 8) * 0.35
      const theta = (index / count) * Math.PI * 2
      const y = 0.2 + (index % 5) * 0.24

      return {
        x: Math.cos(theta) * ring,
        y,
        z: Math.sin(theta) * ring - 4,
        scale: 0.08 + (index % 4) * 0.02,
      }
    })
  }, [count])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return
    }

    for (let i = 0; i < count; i += 1) {
      const transform = transforms[i]
      dummy.position.set(transform.x, transform.y, transform.z)
      dummy.rotation.set(0, i * 0.13, 0)
      dummy.scale.setScalar(transform.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [count, dummy, transforms])

  useFrame(({ clock }, delta) => {
    if (delta > 1 / 20) {
      return
    }

    const mesh = meshRef.current
    if (!mesh) {
      return
    }

    const animatedCount = Math.min(count, 24)
    const elapsed = clock.elapsedTime

    for (let i = 0; i < animatedCount; i += 1) {
      const transform = transforms[i]
      const bob = Math.sin(elapsed * 1.8 + i * 0.4) * 0.1

      dummy.position.set(transform.x, transform.y + bob, transform.z)
      dummy.rotation.set(0, i * 0.13 + elapsed * 0.2, 0)
      dummy.scale.setScalar(transform.scale)
      dummy.updateMatrix()

      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </instancedMesh>
  )
}

export function BasicShapes({ qualityFactor }: BasicShapesProps) {
  return (
    <>
      <Cube />
      <Sphere />
      <InstancedBlocks qualityFactor={qualityFactor} />
    </>
  )
}
