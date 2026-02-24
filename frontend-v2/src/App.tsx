import './App.css'
import { XRScene } from './scenes/XRScene'
import { XRProvider } from './xr/XRProvider'
import { useXRSession } from './xr/useXRSession'

function XRAppShell() {
  const { enterVR, exitXR, isPresenting, isSupported, mode, statusText } = useXRSession()

  return (
    <main className="xr-app-shell">
      <XRScene />

      <section className="hud-panel" aria-label="xr-hud">
        <h1>Phase 2.5 · React Three Fiber 核心场景</h1>

        <div className="hud-actions">
          <button
            type="button"
            onClick={() => {
              void (isPresenting ? exitXR() : enterVR())
            }}
            disabled={isSupported === false}
          >
            {isPresenting ? 'Exit VR' : 'Enter VR'}
          </button>
        </div>

        <p>{statusText}</p>
        <p>当前模式：{mode ?? 'desktop'}</p>
        <p>桌面 fallback：拖拽旋转视角，点击立方体/球体可交互。</p>
      </section>
    </main>
  )
}

function App() {
  return (
    <XRProvider>
      <XRAppShell />
    </XRProvider>
  )
}

export default App
