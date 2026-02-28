/**
 * Models Store
 * 统一管理V0.3/V0.2/V0.1三种方案生成的3D模型
 * 
 * 使用Zustand进行状态管理，与现有架构保持一致
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Model3D {
  id: string
  type: 'ml_sharp' | 'zhitianxia' | 'kiri'
  format: 'glb' | 'obj' | 'ply'
  url: string
  metadata: {
    source: string
    quality: 'preview' | 'standard' | 'premium'
    room_type?: string
    created_at: string
    file_size?: number
    processing_time?: number
  }
}

interface ModelsState {
  models: Model3D[]
  activeModel: string | null
  loading: boolean
  error: string | null
}

interface ModelsActions {
  addModel: (model: Model3D) => void
  removeModel: (id: string) => void
  setActiveModel: (id: string | null) => void
  updateModel: (id: string, updates: Partial<Model3D>) => void
  clearModels: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getModelsByType: (type: Model3D['type']) => Model3D[]
  getActiveModel: () => Model3D | null
}

export const useModelStore = create<ModelsState & ModelsActions>()(
  immer((set, get) => ({
    // State
    models: [],
    activeModel: null,
    loading: false,
    error: null,

    // Actions
    addModel: (model) =>
      set((state) => {
        state.models.push(model)
        // 自动设置为活跃模型
        if (!state.activeModel) {
          state.activeModel = model.id
        }
        state.error = null
      }),

    removeModel: (id) =>
      set((state) => {
        state.models = state.models.filter((model) => model.id !== id)
        if (state.activeModel === id) {
          state.activeModel = state.models.length > 0 ? state.models[0].id : null
        }
      }),

    setActiveModel: (id) =>
      set((state) => {
        state.activeModel = id
      }),

    updateModel: (id, updates) =>
      set((state) => {
        const index = state.models.findIndex((model) => model.id === id)
        if (index !== -1) {
          Object.assign(state.models[index], updates)
        }
      }),

    clearModels: () =>
      set((state) => {
        state.models = []
        state.activeModel = null
        state.error = null
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
        state.loading = false
      }),

    // Selectors
    getModelsByType: (type) => {
      return get().models.filter((model) => model.type === type)
    },

    getActiveModel: () => {
      const { models, activeModel } = get()
      return models.find((model) => model.id === activeModel) || null
    }
  }))
)

// 便捷的选择器hooks
export const useActiveModel = () => useModelStore((state) => state.getActiveModel())
export const useModelsByType = (type: Model3D['type']) => 
  useModelStore((state) => state.getModelsByType(type))

// 模型类型标签
export const MODEL_TYPE_LABELS = {
  ml_sharp: 'ML_Sharp (快速预览)',
  zhitianxia: '知天下AI (高质量)',
  kiri: 'KIRI Engine (专业级)'
} as const

// 质量等级标签
export const QUALITY_LABELS = {
  preview: '预览质量',
  standard: '标准质量', 
  premium: '专业质量'
} as const