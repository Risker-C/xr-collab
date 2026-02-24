import { beforeEach, describe, expect, it } from 'vitest'

import type { RoomParticipant } from '../types/room'
import { selectParticipants, useRoomStore } from './roomStore'

const participant = (id: string, username: string): RoomParticipant => ({
  id,
  username,
  role: 'member',
  isOnline: true,
})

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.getState().reset()
  })

  it('updates room context and participant list', () => {
    const store = useRoomStore.getState()

    store.setCurrentRoom({ id: 'room-1', name: 'Alpha' })
    store.setRole('owner')
    store.setParticipants([participant('u1', 'Alice'), participant('u2', 'Bob')])

    const state = useRoomStore.getState()
    expect(state.currentRoom?.id).toBe('room-1')
    expect(state.role).toBe('owner')
    expect(selectParticipants(state).map((p) => p.username)).toEqual(['Alice', 'Bob'])
  })

  it('supports upsert/remove participant', () => {
    const store = useRoomStore.getState()

    store.upsertParticipant(participant('u1', 'Alice'))
    store.upsertParticipant({ ...participant('u1', 'Alice Updated'), role: 'viewer' })

    expect(useRoomStore.getState().participants.u1.username).toBe('Alice Updated')

    store.removeParticipant('u1')

    expect(useRoomStore.getState().participants.u1).toBeUndefined()
  })
})
