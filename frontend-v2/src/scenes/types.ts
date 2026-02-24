export type SceneObjectType = 'cube' | 'sphere' | 'cylinder' | 'torus' | 'pyramid'

export type Vec3Tuple = [number, number, number]

export interface SceneObject {
  id: string
  type: SceneObjectType
  color: string
  position: Vec3Tuple
  rotation: Vec3Tuple
  scale: Vec3Tuple
}

export interface PoseSnapshot {
  position: Vec3Tuple
  rotation: Vec3Tuple
  timestamp: number
}

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardStroke {
  id: string
  points: WhiteboardPoint[]
  color: string
  width: number
  timestamp: number
}
