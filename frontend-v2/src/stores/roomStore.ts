import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { RoomParticipant, RoomRole, RoomSummary } from '../types/room'
import { safeJSONStorage } from './storage'

export interface RoomStoreState {
  currentRoom: RoomSummary | null
  participants: Record<string, RoomParticipant>
  participantOrder: string[]
  username: string
  role: RoomRole
}

export interface RoomStoreActions {
  setCurrentRoom: (room: RoomSummary | null) => void
  setUsername: (username: string) => void
  setRole: (role: RoomRole) => void
  setParticipants: (participants: RoomParticipant[]) => void
  upsertParticipant: (participant: RoomParticipant) => void
  removeParticipant: (participantId: string) => void
  clearRoom: () => void
  reset: () => void
}

export type RoomStore = RoomStoreState & RoomStoreActions

const initialRoomState: RoomStoreState = {
  currentRoom: null,
  participants: {},
  participantOrder: [],
  username: '用户',
  role: 'member',
}

export const useRoomStore = create<RoomStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialRoomState,
        setCurrentRoom: (room) => {
          set((state) => {
            state.currentRoom = room
            if (!room) {
              state.participants = {}
              state.participantOrder = []
              state.role = 'member'
            }
          })
        },
        setUsername: (username) => {
          set((state) => {
            state.username = username.trim() || '用户'
          })
        },
        setRole: (role) => {
          set((state) => {
            state.role = role
          })
        },
        setParticipants: (participants) => {
          set((state) => {
            state.participants = {}
            state.participantOrder = []

            participants.forEach((participant) => {
              state.participants[participant.id] = participant
              state.participantOrder.push(participant.id)
            })
          })
        },
        upsertParticipant: (participant) => {
          set((state) => {
            state.participants[participant.id] = participant
            if (!state.participantOrder.includes(participant.id)) {
              state.participantOrder.push(participant.id)
            }
          })
        },
        removeParticipant: (participantId) => {
          set((state) => {
            delete state.participants[participantId]
            state.participantOrder = state.participantOrder.filter((id) => id !== participantId)
          })
        },
        clearRoom: () => {
          set((state) => {
            state.currentRoom = null
            state.participants = {}
            state.participantOrder = []
            state.role = 'member'
          })
        },
        reset: () => {
          set(() => ({
            ...initialRoomState,
          }))
        },
      })),
      {
        name: 'xr-room-store',
        storage: safeJSONStorage,
        partialize: (state) => ({
          currentRoom: state.currentRoom,
          username: state.username,
          role: state.role,
        }),
      },
    ),
    { name: 'roomStore' },
  ),
)

export const selectParticipants = (state: RoomStore): RoomParticipant[] =>
  state.participantOrder
    .map((id) => state.participants[id])
    .filter((participant): participant is RoomParticipant => Boolean(participant))
