import { describe, expect, it } from 'vitest'
import { appendCurvePoint, clampUv } from './whiteboardUtils'

describe('whiteboard curve helpers', () => {
  it('clamps uv points into [0, 1] range', () => {
    const point = clampUv({ x: -0.2, y: 1.4 })

    expect(point).toEqual({ x: 0, y: 1 })
  })

  it('skips points with negligible distance to avoid noisy curves', () => {
    const points = appendCurvePoint([{ x: 0.5, y: 0.5 }], { x: 0.5005, y: 0.5005 }, 0.01)

    expect(points).toHaveLength(1)
  })
})
