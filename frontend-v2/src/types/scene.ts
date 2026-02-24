export interface Vector3Like {
  x: number
  y: number
  z: number
}

export interface EulerLike {
  x: number
  y: number
  z: number
}

export interface QuaternionLike {
  x: number
  y: number
  z: number
  w: number
}

export type SceneObjectKind =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'plane'
  | 'custom'

export interface SceneTransform {
  position: Vector3Like
  rotation: EulerLike
  scale: Vector3Like
}

export interface SceneObject {
  id: string
  roomId: string
  ownerId: string
  kind: SceneObjectKind
  transform: SceneTransform
  color?: string
  material?: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface WhiteboardStroke {
  id: string
  points: Vector3Like[]
  color: string
  width: number
  authorId: string
  createdAt: number
}

export interface WhiteboardSnapshot {
  id: string
  roomId: string
  title?: string
  strokes: WhiteboardStroke[]
  redoStack?: WhiteboardStroke[]
  lockedBy?: string | null
  updatedAt: number
}

export interface UserPose {
  position: Vector3Like
  rotation: EulerLike
  timestamp: number
}
