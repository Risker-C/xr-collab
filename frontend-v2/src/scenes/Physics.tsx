import { useFrame } from '@react-three/fiber'
import { Body, Box, Cylinder, Plane, Quaternion, Sphere, Vec3, World } from 'cannon-es'
import { createContext, useCallback, useContext, useMemo, useRef, type PropsWithChildren } from 'react'
import type { Object3D } from 'three'
import type { SceneObject, SceneObjectType, Vec3Tuple } from './types'

interface BodyBinding {
  mesh: Object3D
  body: Body
}

interface PhysicsApi {
  registerObject: (object: SceneObject, mesh: Object3D) => void
  unregisterObject: (id: string) => void
  setKinematic: (id: string, kinematic: boolean) => void
  setPosition: (id: string, position: Vec3Tuple) => void
  applyImpulse: (id: string, impulse: Vec3Tuple) => void
}

const PhysicsContext = createContext<PhysicsApi | null>(null)

export function createPhysicsShape(type: SceneObjectType) {
  switch (type) {
    case 'cube':
      return new Box(new Vec3(0.25, 0.25, 0.25))
    case 'sphere':
      return new Sphere(0.25)
    case 'cylinder':
      return new Cylinder(0.2, 0.2, 0.5, 16)
    case 'torus':
      return new Sphere(0.3)
    case 'pyramid':
      return new Cylinder(0.3, 0.01, 0.5, 4)
    default:
      return new Box(new Vec3(0.25, 0.25, 0.25))
  }
}

function createWorld() {
  const world = new World({
    gravity: new Vec3(0, -9.82, 0),
  })

  const groundBody = new Body({
    mass: 0,
    shape: new Plane(),
  })
  groundBody.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2)
  world.addBody(groundBody)

  return world
}

export function Physics({ children }: PropsWithChildren) {
  const worldRef = useRef<World>(createWorld())
  const bindingsRef = useRef<Map<string, BodyBinding>>(new Map())
  const accumulatorRef = useRef(0)

  const registerObject = useCallback((object: SceneObject, mesh: Object3D) => {
    if (bindingsRef.current.has(object.id)) return

    const body = new Body({
      mass: 1,
      shape: createPhysicsShape(object.type),
      position: new Vec3(object.position[0], object.position[1], object.position[2]),
      quaternion: new Quaternion().setFromEuler(
        object.rotation[0],
        object.rotation[1],
        object.rotation[2],
        'XYZ',
      ),
      linearDamping: 0.35,
      angularDamping: 0.4,
    })

    worldRef.current.addBody(body)
    bindingsRef.current.set(object.id, { mesh, body })
  }, [])

  const unregisterObject = useCallback((id: string) => {
    const binding = bindingsRef.current.get(id)
    if (!binding) return

    worldRef.current.removeBody(binding.body)
    bindingsRef.current.delete(id)
  }, [])

  const setKinematic = useCallback((id: string, kinematic: boolean) => {
    const binding = bindingsRef.current.get(id)
    if (!binding) return

    const bodyType = kinematic ? Body.KINEMATIC : Body.DYNAMIC
    if (binding.body.type === bodyType) return

    binding.body.type = bodyType
    binding.body.mass = kinematic ? 0 : 1
    binding.body.velocity.set(0, 0, 0)
    binding.body.angularVelocity.set(0, 0, 0)
    binding.body.updateMassProperties()
  }, [])

  const setPosition = useCallback((id: string, position: Vec3Tuple) => {
    const binding = bindingsRef.current.get(id)
    if (!binding) return

    binding.body.position.set(position[0], position[1], position[2])
    binding.body.velocity.set(0, 0, 0)
    binding.body.angularVelocity.set(0, 0, 0)

    binding.mesh.position.set(position[0], position[1], position[2])
  }, [])

  const applyImpulse = useCallback((id: string, impulse: Vec3Tuple) => {
    const binding = bindingsRef.current.get(id)
    if (!binding) return

    binding.body.type = Body.DYNAMIC
    binding.body.mass = 1
    binding.body.updateMassProperties()
    binding.body.applyImpulse(new Vec3(impulse[0], impulse[1], impulse[2]), binding.body.position)
  }, [])

  useFrame((_, delta) => {
    const step = 1 / 60
    const maxSubSteps = 8

    accumulatorRef.current += delta
    let subSteps = 0

    while (accumulatorRef.current >= step && subSteps < maxSubSteps) {
      worldRef.current.step(step)
      accumulatorRef.current -= step
      subSteps += 1
    }

    bindingsRef.current.forEach(({ mesh, body }) => {
      if (body.type === Body.KINEMATIC) return

      mesh.position.set(body.position.x, body.position.y, body.position.z)
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    })
  })

  const api = useMemo<PhysicsApi>(
    () => ({
      registerObject,
      unregisterObject,
      setKinematic,
      setPosition,
      applyImpulse,
    }),
    [applyImpulse, registerObject, setKinematic, setPosition, unregisterObject],
  )

  return <PhysicsContext.Provider value={api}>{children}</PhysicsContext.Provider>
}

export function usePhysics() {
  const context = useContext(PhysicsContext)
  if (!context) {
    throw new Error('usePhysics must be used within <Physics />')
  }
  return context
}
