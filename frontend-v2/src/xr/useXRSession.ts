import { useMemo } from 'react'
import { useXRProvider } from './xrContext'

export function useXRSession() {
  const { isPresenting, isSupported, mode, enterVR, exitXR } = useXRProvider()

  const statusText = useMemo(() => {
    if (isSupported === undefined) {
      return '正在检测设备 WebXR 能力…'
    }

    if (isSupported === false) {
      return '当前设备不支持 immersive-vr，将使用桌面模式。'
    }

    if (isPresenting) {
      return 'VR session 已启动。'
    }

    return '设备支持 VR，可点击 Enter VR 进入沉浸模式。'
  }, [isPresenting, isSupported])

  return {
    isPresenting,
    isSupported,
    mode,
    statusText,
    enterVR,
    exitXR,
  }
}
