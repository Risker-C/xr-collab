import { describe, expect, it, vi } from 'vitest'

import type { MessageHandlerDependencies } from './MessageHandler'
import { MessageHandler } from './MessageHandler'

const now = Date.now()

const createDeps = (): MessageHandlerDependencies => ({
  room: {
    getParticipant: vi.fn(() => ({
      id: 'u1',
      username: 'Alice',
      role: 'member' as const,
      isOnline: true,
    })),
    setCurrentRoom: vi.fn(),
    setRole: vi.fn(),
    setParticipants: vi.fn(),
    upsertParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  },
  scene: {
    setObjects: vi.fn(),
    upsertObject: vi.fn(),
    patchObjectTransform: vi.fn(),
    removeObject: vi.fn(),
    setWhiteboard: vi.fn(),
  },
  connection: {
    markError: vi.fn(),
    setLatency: vi.fn(),
  },
  ui: {
    pushToast: vi.fn(() => 'toast-1'),
  },
})

describe('MessageHandler', () => {
  it('routes room:joined payload to stores', () => {
    const deps = createDeps()
    const handler = new MessageHandler(deps)

    handler.handle({
      type: 'room:joined',
      payload: {
        room: { id: 'room-1', name: 'Alpha' },
        role: 'owner',
        participants: [
          { id: 'u1', username: 'Alice', role: 'owner', isOnline: true },
          { id: 'u2', username: 'Bob', role: 'member', isOnline: true },
        ],
        objects: [],
        whiteboards: [
          {
            id: 'wb-1',
            roomId: 'room-1',
            strokes: [],
            updatedAt: now,
          },
        ],
      },
    })

    expect(deps.room.setCurrentRoom).toHaveBeenCalledWith({ id: 'room-1', name: 'Alpha' })
    expect(deps.room.setRole).toHaveBeenCalledWith('owner')
    expect(deps.room.setParticipants).toHaveBeenCalledTimes(1)
    expect(deps.scene.setObjects).toHaveBeenCalledTimes(1)
    expect(deps.scene.setWhiteboard).toHaveBeenCalledTimes(1)
  })

  it('handles error and pong message', () => {
    const deps = createDeps()
    const handler = new MessageHandler(deps)

    handler.handle({
      type: 'error',
      payload: {
        code: 'ROOM_LOCKED',
        message: '房间已锁定',
      },
    })

    handler.handle({
      type: 'pong',
      payload: {
        sentAt: 100,
        receivedAt: 140,
      },
    })

    expect(deps.connection.markError).toHaveBeenCalledWith('房间已锁定')
    expect(deps.ui.pushToast).toHaveBeenCalledWith({
      level: 'error',
      message: '房间已锁定',
    })
    expect(deps.connection.setLatency).toHaveBeenCalledWith(40)
  })
})
