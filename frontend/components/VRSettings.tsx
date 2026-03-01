'use client'

import { useState } from 'react'

export function VRSettings() {
  const [comfort, setComfort] = useState({
    vignette: true,
    teleport: true,
    smoothTurn: false,
    snapTurn: true,
    tunneling: true
  })

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-white/10">
      <h2 className="text-white font-bold mb-4">VR舒适性设置</h2>

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-gray-300">视野限制（减少晕动症）</span>
          <input
            type="checkbox"
            checked={comfort.vignette}
            onChange={(e) => setComfort({ ...comfort, vignette: e.target.checked })}
            aria-label="切换视野限制"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-gray-300">传送移动</span>
          <input
            type="checkbox"
            checked={comfort.teleport}
            onChange={(e) => setComfort({ ...comfort, teleport: e.target.checked })}
            aria-label="切换传送移动"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-gray-300">快速转向（30°）</span>
          <input
            type="checkbox"
            checked={comfort.snapTurn}
            onChange={(e) => setComfort({ ...comfort, snapTurn: e.target.checked })}
            aria-label="切换快速转向"
          />
        </label>
      </div>
    </div>
  )
}
