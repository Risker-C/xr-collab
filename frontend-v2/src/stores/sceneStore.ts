import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { SceneObject, SceneTransform, WhiteboardSnapshot } from '../types/scene'
import { safeJSONStorage } from './storage'

export interface SceneStoreState {
  objects: Record<string, SceneObject>
  whiteboards: Record<string, WhiteboardSnapshot>
  selectedObjectId: string | null
}

export interface SceneStoreActions {
  setObjects: (objects: SceneObject[]) => void
  upsertObject: (object: SceneObject) => void
  patchObjectTransform: (objectId: string, transform: Partial<SceneTransform>) => void
  removeObject: (objectId: string) => void
  clearObjects: () => void
  setWhiteboard: (whiteboard: WhiteboardSnapshot) => void
  removeWhiteboard: (whiteboardId: string) => void
  clearWhiteboards: () => void
  selectObject: (objectId: string | null) => void
  reset: () => void
}

export type SceneStore = SceneStoreState & SceneStoreActions

const initialSceneState: SceneStoreState = {
  objects: {},
  whiteboards: {},
  selectedObjectId: null,
}

export const useSceneStore = create<SceneStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialSceneState,
        setObjects: (objects) => {
          set((state) => {
            state.objects = {}
            objects.forEach((object) => {
              state.objects[object.id] = object
            })
          })
        },
        upsertObject: (object) => {
          set((state) => {
            state.objects[object.id] = object
          })
        },
        patchObjectTransform: (objectId, transform) => {
          set((state) => {
            const existing = state.objects[objectId]
            if (!existing) {
              return
            }

            existing.transform = {
              ...existing.transform,
              ...transform,
            }
            existing.updatedAt = Date.now()
          })
        },
        removeObject: (objectId) => {
          set((state) => {
            delete state.objects[objectId]
            if (state.selectedObjectId === objectId) {
              state.selectedObjectId = null
            }
          })
        },
        clearObjects: () => {
          set((state) => {
            state.objects = {}
            state.selectedObjectId = null
          })
        },
        setWhiteboard: (whiteboard) => {
          set((state) => {
            state.whiteboards[whiteboard.id] = whiteboard
          })
        },
        removeWhiteboard: (whiteboardId) => {
          set((state) => {
            delete state.whiteboards[whiteboardId]
          })
        },
        clearWhiteboards: () => {
          set((state) => {
            state.whiteboards = {}
          })
        },
        selectObject: (objectId) => {
          set((state) => {
            state.selectedObjectId = objectId
          })
        },
        reset: () => {
          set(() => ({
            ...initialSceneState,
          }))
        },
      })),
      {
        name: 'xr-scene-store',
        storage: safeJSONStorage,
        partialize: (state) => ({
          whiteboards: state.whiteboards,
        }),
      },
    ),
    { name: 'sceneStore' },
  ),
)
