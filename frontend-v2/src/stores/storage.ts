import { createJSONStorage } from 'zustand/middleware'

const memoryStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (name: string): string | null => store[name] ?? null,
    setItem: (name: string, value: string): void => {
      store[name] = value
    },
    removeItem: (name: string): void => {
      delete store[name]
    },
    clear: (): void => {
      store = {}
    },
  }
})()

const getStorage = (): Storage => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return memoryStorage as unknown as Storage
}

export const safeJSONStorage = createJSONStorage(getStorage)
