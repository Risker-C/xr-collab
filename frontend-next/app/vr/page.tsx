'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from '@/lib/config'

export default function VRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [inRoom, setInRoom] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return

    // Three.js场景初始化
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight - 64)
    renderer.setClearColor(0x000000)
    camera.position.z = 5

    // 添加基本光照
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(1, 1, 1)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x404040))

    // 添加地面网格
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444)
    scene.add(gridHelper)

    // Socket.IO连接
    const socket: Socket = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true
    })

    socket.on('connect', () => {
      console.log('✅ Connected to backend')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend')
      setIsConnected(false)
    })

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // 窗口大小调整
    const handleResize = () => {
      camera.aspect = window.innerWidth / (window.innerHeight - 64)
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight - 64)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      socket.disconnect()
      renderer.dispose()
    }
  }, [])

  const createRoom = () => {
    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    setRoomId(newRoomId)
    setInRoom(true)
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full" style={{ height: 'calc(100vh - 64px)' }} />
      
      {!inRoom && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 p-8 rounded-2xl border border-white/10 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">进入VR协作空间</h2>
            
            <div className="space-y-4">
              <button
                onClick={createRoom}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                创建新房间
              </button>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="输入房间ID加入"
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
                <button
                  onClick={() => roomId && setInRoom(true)}
                  disabled={!roomId}
                  className="absolute right-2 top-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                >
                  加入
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-gray-400">
                {isConnected ? '已连接到服务器' : '连接中...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {inRoom && (
        <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 rounded-lg border border-white/10">
          <div className="text-white font-mono">{roomId}</div>
        </div>
      )}
    </div>
  )
}