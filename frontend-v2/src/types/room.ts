import type { UserPose } from './scene'

export type RoomRole = 'owner' | 'member' | 'viewer'

export interface RoomSummary {
  id: string
  name?: string
  ownerId?: string
  isPrivate?: boolean
  createdAt?: number
}

export interface RoomParticipant {
  id: string
  socketId?: string
  username: string
  role: RoomRole
  isOnline: boolean
  pose?: UserPose
  joinedAt?: number
  updatedAt?: number
}

export interface RoomStateSnapshot {
  room: RoomSummary
  participants: RoomParticipant[]
  role: RoomRole
}
