import { Box, Cylinder, Sphere } from 'cannon-es'
import { describe, expect, it } from 'vitest'
import { createPhysicsShape } from './Physics'

describe('Physics shape factory', () => {
  it('creates a box collider for cube', () => {
    expect(createPhysicsShape('cube')).toBeInstanceOf(Box)
  })

  it('creates a sphere collider for sphere', () => {
    expect(createPhysicsShape('sphere')).toBeInstanceOf(Sphere)
  })

  it('creates a tapered collider for pyramid', () => {
    expect(createPhysicsShape('pyramid')).toBeInstanceOf(Cylinder)
  })
})
