import { describe, expect, it, vi } from 'vitest'

import type { UserPose } from '../types/scene'
import { SyncService } from './SyncService'

const createPose = (x: number, timestamp: number): UserPose => ({
  position: { x, y: 1.6, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  timestamp,
})

describe('SyncService', () => {
  it('throttles pose sync to 12.5Hz and movement threshold', () => {
    const sender = {
      send: vi.fn(() => true),
      isConnected: vi.fn(() => true),
    }

    const syncService = new SyncService(sender)
    syncService.bindSession('room-1', 'user-1')

    const first = syncService.syncPose(createPose(0, 1_000), 1_000)
    const tooEarly = syncService.syncPose(createPose(0.5, 1_020), 1_020)
    const tooSmallMove = syncService.syncPose(createPose(0.01, 1_100), 1_100)
    const validNext = syncService.syncPose(createPose(0.6, 1_200), 1_200)

    expect(first).toBe(true)
    expect(tooEarly).toBe(false)
    expect(tooSmallMove).toBe(false)
    expect(validNext).toBe(true)
    expect(sender.send).toHaveBeenCalledTimes(2)
  })

  it('does not sync when disconnected or session is missing', () => {
    const sender = {
      send: vi.fn(() => true),
      isConnected: vi.fn(() => false),
    }

    const syncService = new SyncService(sender)

    expect(syncService.syncPose(createPose(0, 1_000), 1_000)).toBe(false)
    expect(sender.send).not.toHaveBeenCalled()
  })
})
