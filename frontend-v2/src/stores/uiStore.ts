import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { safeJSONStorage } from './storage'

export type ActiveModal = 'none' | 'join-room' | 'settings' | 'invite' | 'chat' | 'whiteboard'

export interface ToastMessage {
  id: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  createdAt: number
}

export interface UiStoreState {
  isLeftSidebarOpen: boolean
  isRightSidebarOpen: boolean
  activeModal: ActiveModal
  isHelpVisible: boolean
  toasts: ToastMessage[]
}

export interface UiStoreActions {
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setActiveModal: (modal: ActiveModal) => void
  setHelpVisible: (visible: boolean) => void
  pushToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  reset: () => void
}

export type UiStore = UiStoreState & UiStoreActions

const initialUiState: UiStoreState = {
  isLeftSidebarOpen: true,
  isRightSidebarOpen: false,
  activeModal: 'none',
  isHelpVisible: true,
  toasts: [],
}

const createToastId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const useUiStore = create<UiStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialUiState,
        toggleLeftSidebar: () => {
          set((state) => {
            state.isLeftSidebarOpen = !state.isLeftSidebarOpen
          })
        },
        toggleRightSidebar: () => {
          set((state) => {
            state.isRightSidebarOpen = !state.isRightSidebarOpen
          })
        },
        setActiveModal: (modal) => {
          set((state) => {
            state.activeModal = modal
          })
        },
        setHelpVisible: (visible) => {
          set((state) => {
            state.isHelpVisible = visible
          })
        },
        pushToast: (toast) => {
          const id = createToastId()
          set((state) => {
            state.toasts.push({
              ...toast,
              id,
              createdAt: Date.now(),
            })
          })
          return id
        },
        removeToast: (id) => {
          set((state) => {
            state.toasts = state.toasts.filter((toast) => toast.id !== id)
          })
        },
        clearToasts: () => {
          set((state) => {
            state.toasts = []
          })
        },
        reset: () => {
          set(() => ({
            ...initialUiState,
          }))
        },
      })),
      {
        name: 'xr-ui-store',
        storage: safeJSONStorage,
        partialize: (state) => ({
          isLeftSidebarOpen: state.isLeftSidebarOpen,
          isRightSidebarOpen: state.isRightSidebarOpen,
          isHelpVisible: state.isHelpVisible,
        }),
      },
    ),
    { name: 'uiStore' },
  ),
)
