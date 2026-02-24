import { createContext, useContext } from 'react'
import type { XRStore } from '@react-three/xr'

export interface XRProviderContextValue {
  store: XRStore
  isPresenting: boolean
  mode: XRSessionMode | null
  isSupported: boolean | undefined
  enterVR: () => Promise<void>
  exitXR: () => Promise<void>
}

export const XRProviderContext = createContext<XRProviderContextValue | null>(null)

export function useXRProvider() {
  const context = useContext(XRProviderContext)

  if (!context) {
    throw new Error('useXRProvider must be used inside <XRProvider>.')
  }

  return context
}
