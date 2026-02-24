import { Sky } from '@react-three/drei'

export function Environment() {
  return (
    <>
      <color attach="background" args={['#87ceeb']} />
      <fog attach="fog" args={['#87ceeb', 10, 120]} />

      <Sky
        distance={400}
        sunPosition={[8, 12, 8]}
        inclination={0.55}
        azimuth={0.16}
        turbidity={8}
        mieCoefficient={0.004}
        mieDirectionalG={0.8}
      />

      <ambientLight intensity={0.6} />

      <directionalLight
        castShadow
        position={[8, 12, 8]}
        intensity={0.9}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ isGround: true }}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#7cfc00" roughness={0.95} metalness={0.02} />
      </mesh>

      <gridHelper args={[120, 120, '#336633', '#336633']} position={[0, 0.01, 0]} />
    </>
  )
}
