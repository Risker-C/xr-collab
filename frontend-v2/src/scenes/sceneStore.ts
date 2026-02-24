import { create } from 'zustand'
import type { PoseSnapshot, SceneObject, SceneObjectType, Vec3Tuple, WhiteboardStroke } from './types'

interface SceneState {
  objects: SceneObject[]
  selectedObjectId: string | null
  whiteboardStrokes: WhiteboardStroke[]
  localPose: PoseSnapshot | null
  addObject: (type: SceneObjectType, position: Vec3Tuple, color?: string) => string
  updateObject: (id: string, updates: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale' | 'color'>>) => void
  removeObject: (id: string) => void
  clearObjects: () => void
  setSelectedObject: (id: string | null) => void
  addWhiteboardStroke: (stroke: WhiteboardStroke) => void
  setLocalPose: (pose: PoseSnapshot) => void
}

const palette = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7']

function buildObjectId(type: SceneObjectType): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function initialObjects(): SceneObject[] {
  return [
    {
      id: buildObjectId('cube'),
      type: 'cube',
      color: '#ef4444',
      position: [0, 1.2, -1.8],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    {
      id: buildObjectId('sphere'),
      type: 'sphere',
      color: '#3b82f6',
      position: [0.8, 1.6, -2.2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  ]
}

export const useSceneStore = create<SceneState>((set) => ({
  objects: initialObjects(),
  selectedObjectId: null,
  whiteboardStrokes: [],
  localPose: null,
  addObject: (type, position, color) => {
    const nextId = buildObjectId(type)
    const nextColor = color ?? palette[Math.floor(Math.random() * palette.length)]

    set((state) => ({
      objects: [
        ...state.objects,
        {
          id: nextId,
          type,
          color: nextColor,
          position,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
    }))

    return nextId
  },
  updateObject: (id, updates) => {
    set((state) => ({
      objects: state.objects.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }))
  },
  removeObject: (id) => {
    set((state) => ({
      objects: state.objects.filter((item) => item.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    }))
  },
  clearObjects: () => {
    set({ objects: [], selectedObjectId: null })
  },
  setSelectedObject: (id) => {
    set({ selectedObjectId: id })
  },
  addWhiteboardStroke: (stroke) => {
    set((state) => ({
      whiteboardStrokes: [...state.whiteboardStrokes, stroke].slice(-200),
    }))
  },
  setLocalPose: (pose) => {
    set({ localPose: pose })
  },
}))
