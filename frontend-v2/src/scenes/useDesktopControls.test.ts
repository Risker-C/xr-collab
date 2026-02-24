import { Euler, Quaternion } from 'three'
import { describe, expect, it } from 'vitest'
import { computeMoveIntent, computeWorldDeltaFromIntent } from './useDesktopControls'

describe('useDesktopControls helpers', () => {
  it('normalizes move intent for diagonal movement', () => {
    const intent = computeMoveIntent({ forward: true, backward: false, left: false, right: true })

    expect(intent.x).toBeCloseTo(Math.SQRT1_2)
    expect(intent.z).toBeCloseTo(-Math.SQRT1_2)
  })

  it('projects movement into world coordinates using camera quaternion', () => {
    const yawRight = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0))
    const delta = computeWorldDeltaFromIntent({ x: 0, z: -1 }, yawRight, 1, 2)

    expect(delta.x).toBeCloseTo(2, 3)
    expect(delta.z).toBeCloseTo(0, 3)
  })
})
