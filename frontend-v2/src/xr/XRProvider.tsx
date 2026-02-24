import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createXRStore } from '@react-three/xr'
import { XRProviderContext, type XRProviderContextValue } from './xrContext'

const xrStore = createXRStore({
  emulate: false,
  frameRate: 'high',
  foveation: 0.5,
  domOverlay: true,
})

function getXRSystem() {
  return (navigator as Navigator & { xr?: XRSystem }).xr
}

export function XRProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState<boolean | undefined>(() => (getXRSystem() ? undefined : false))

  useEffect(() => {
    const xr = getXRSystem()

    if (!xr) {
      return
    }

    let cancelled = false

    xr
      .isSessionSupported('immersive-vr')
      .then((supported) => {
        if (!cancelled) {
          setIsSupported(supported)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSupported(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const storeState = useSyncExternalStore(
    (onStoreChange) => xrStore.subscribe(() => onStoreChange()),
    xrStore.getState,
    xrStore.getState,
  )

  const enterVR = useCallback(async () => {
    if (isSupported === false) {
      return
    }

    await xrStore.enterVR()
  }, [isSupported])

  const exitXR = useCallback(async () => {
    const session = xrStore.getState().session
    if (!session) {
      return
    }

    await session.end()
  }, [])

  const value = useMemo<XRProviderContextValue>(
    () => ({
      store: xrStore,
      isPresenting: storeState.session != null,
      mode: storeState.mode,
      isSupported,
      enterVR,
      exitXR,
    }),
    [storeState.session, storeState.mode, isSupported, enterVR, exitXR],
  )

  return <XRProviderContext.Provider value={value}>{children}</XRProviderContext.Provider>
}
