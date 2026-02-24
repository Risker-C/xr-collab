import { OrbitControls } from '@react-three/drei'
import { IfInSessionMode, useXR, useXRControllerLocomotion } from '@react-three/xr'
import type { RefObject } from 'react'
import type { Group } from 'three'

interface VRControlsProps {
  originRef: RefObject<Group | null>
}

function VRLocomotion({ originRef }: VRControlsProps) {
  useXRControllerLocomotion(
    originRef,
    {
      speed: 2.2,
    },
    {
      type: 'snap',
      deadZone: 0.75,
      degrees: 30,
    },
    'left',
  )

  return null
}

export function VRControls({ originRef }: VRControlsProps) {
  const inXR = useXR((state) => state.session != null)

  return (
    <>
      <IfInSessionMode allow="immersive-vr">
        <VRLocomotion originRef={originRef} />
      </IfInSessionMode>

      {!inXR && <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} />}
    </>
  )
}
