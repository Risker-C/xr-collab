import type { WhiteboardPoint } from './types'

export function clampUv(point: WhiteboardPoint): WhiteboardPoint {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  }
}

export function appendCurvePoint(points: WhiteboardPoint[], nextPoint: WhiteboardPoint, minDistance = 0.003) {
  if (points.length === 0) return [clampUv(nextPoint)]

  const last = points[points.length - 1]
  const dx = nextPoint.x - last.x
  const dy = nextPoint.y - last.y

  if (Math.hypot(dx, dy) < minDistance) return points

  return [...points, clampUv(nextPoint)]
}

export function drawCurveSegment(
  context: CanvasRenderingContext2D,
  from: WhiteboardPoint,
  to: WhiteboardPoint,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  width: number,
) {
  context.beginPath()
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.strokeStyle = color
  context.lineWidth = width

  context.moveTo(from.x * canvasWidth, from.y * canvasHeight)

  const centerX = ((from.x + to.x) / 2) * canvasWidth
  const centerY = ((from.y + to.y) / 2) * canvasHeight
  context.quadraticCurveTo(from.x * canvasWidth, from.y * canvasHeight, centerX, centerY)
  context.lineTo(to.x * canvasWidth, to.y * canvasHeight)

  context.stroke()
}
