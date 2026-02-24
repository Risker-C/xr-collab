import { XRDomOverlay, useXR } from '@react-three/xr'

interface DOMOverlayProps {
  fps: number
  dpr: number
}

export function DOMOverlay({ fps, dpr }: DOMOverlayProps) {
  const mode = useXR((state) => state.mode)

  return (
    <XRDomOverlay className="xr-dom-overlay" aria-live="polite">
      <div className="xr-dom-overlay__panel">
        <strong>{mode === 'immersive-vr' ? 'VR Overlay' : 'XR Overlay'}</strong>
        <span>FPS: {fps}</span>
        <span>DPR: {dpr.toFixed(2)}</span>
        <span>Target: VR 72fps</span>
      </div>
    </XRDomOverlay>
  )
}
