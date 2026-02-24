import type { UserPose, Vector3Like } from '../types/scene'
import type { ClientWebSocketMessage } from '../types/websocket'

export interface PoseSyncSender {
  send: (message: ClientWebSocketMessage) => boolean
  isConnected: () => boolean
}

export interface SyncServiceOptions {
  minIntervalMs?: number
  minDistanceMeters?: number
}

const distanceBetween = (left: Vector3Like, right: Vector3Like): number => {
  const dx = left.x - right.x
  const dy = left.y - right.y
  const dz = left.z - right.z
  return Math.hypot(dx, dy, dz)
}

export class SyncService {
  private readonly minIntervalMs: number
  private readonly minDistanceMeters: number

  private roomId: string | null = null
  private userId: string | null = null
  private lastSentAt = 0
  private lastSentPose: UserPose | null = null

  constructor(
    private readonly sender: PoseSyncSender,
    options: SyncServiceOptions = {},
  ) {
    this.minIntervalMs = options.minIntervalMs ?? 80 // 12.5Hz
    this.minDistanceMeters = options.minDistanceMeters ?? 0.02
  }

  bindSession(roomId: string, userId: string): void {
    this.roomId = roomId
    this.userId = userId
    this.lastSentAt = 0
    this.lastSentPose = null
  }

  clearSession(): void {
    this.roomId = null
    this.userId = null
    this.lastSentAt = 0
    this.lastSentPose = null
  }

  syncPose(pose: UserPose, now = Date.now()): boolean {
    if (!this.sender.isConnected() || !this.roomId || !this.userId) {
      return false
    }

    if (now - this.lastSentAt < this.minIntervalMs) {
      return false
    }

    if (this.lastSentPose) {
      const delta = distanceBetween(this.lastSentPose.position, pose.position)
      if (delta < this.minDistanceMeters) {
        return false
      }
    }

    const message: ClientWebSocketMessage = {
      type: 'user:pose',
      payload: {
        roomId: this.roomId,
        userId: this.userId,
        pose,
      },
      timestamp: now,
    }

    const sent = this.sender.send(message)
    if (sent) {
      this.lastSentAt = now
      this.lastSentPose = pose
    }

    return sent
  }

  forceSyncPose(pose: UserPose, now = Date.now()): boolean {
    if (!this.sender.isConnected() || !this.roomId || !this.userId) {
      return false
    }

    const message: ClientWebSocketMessage = {
      type: 'user:pose',
      payload: {
        roomId: this.roomId,
        userId: this.userId,
        pose,
      },
      timestamp: now,
    }

    const sent = this.sender.send(message)
    if (sent) {
      this.lastSentAt = now
      this.lastSentPose = pose
    }

    return sent
  }
}
