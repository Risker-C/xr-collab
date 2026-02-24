import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { safeJSONStorage } from './storage'

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface ConnectionStoreState {
  endpoint: string | null
  status: ConnectionStatus
  retryCount: number
  connectedAt: number | null
  disconnectedAt: number | null
  latencyMs: number | null
  lastError: string | null
}

export interface ConnectionStoreActions {
  setEndpoint: (endpoint: string | null) => void
  setStatus: (status: ConnectionStatus) => void
  markConnected: () => void
  markDisconnected: () => void
  markError: (message: string) => void
  incrementRetry: () => void
  setLatency: (latencyMs: number | null) => void
  reset: () => void
}

export type ConnectionStore = ConnectionStoreState & ConnectionStoreActions

const initialConnectionState: ConnectionStoreState = {
  endpoint: null,
  status: 'idle',
  retryCount: 0,
  connectedAt: null,
  disconnectedAt: null,
  latencyMs: null,
  lastError: null,
}

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialConnectionState,
        setEndpoint: (endpoint) => {
          set((state) => {
            state.endpoint = endpoint
          })
        },
        setStatus: (status) => {
          set((state) => {
            state.status = status
          })
        },
        markConnected: () => {
          set((state) => {
            state.status = 'connected'
            state.connectedAt = Date.now()
            state.disconnectedAt = null
            state.retryCount = 0
            state.lastError = null
          })
        },
        markDisconnected: () => {
          set((state) => {
            state.status = 'disconnected'
            state.disconnectedAt = Date.now()
          })
        },
        markError: (message) => {
          set((state) => {
            state.status = 'error'
            state.lastError = message
          })
        },
        incrementRetry: () => {
          set((state) => {
            state.retryCount += 1
            state.status = 'reconnecting'
          })
        },
        setLatency: (latencyMs) => {
          set((state) => {
            state.latencyMs = latencyMs
          })
        },
        reset: () => {
          set(() => ({
            ...initialConnectionState,
          }))
        },
      })),
      {
        name: 'xr-connection-store',
        storage: safeJSONStorage,
        partialize: (state) => ({
          endpoint: state.endpoint,
        }),
      },
    ),
    { name: 'connectionStore' },
  ),
)
