'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from '@/lib/config'

interface User {
  id: string
  position: THREE.Vector3
  rotation: THREE.Euler
  color: string
}

export default function VRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const socketRef = useRef<Socket | null>(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [users, setUsers] = useState<Map<string, User>>(new Map())
  const [isVRSupported, setIsVRSupported] = useState(false)

  // 检查WebXR支持
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      navigator.xr?.isSessionSupported('immersive-vr').then(setIsVRSupported)
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    // Three.js场景初始化
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    })
    
    renderer.setSize(window.innerWidth, window.innerHeight - 64)
    renderer.setClearColor(0x0a0a0a, 1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    camera.position.set(0, 1.6, 5) // 人眼高度

    // 存储引用
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera

    // 增强光照系统
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // 点光源
    const pointLight = new THREE.PointLight(0x00ff88, 0.5, 10)
    pointLight.position.set(0, 3, 0)
    scene.add(pointLight)

    // 增强地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20)
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
    scene.add(gridHelper)

    // 添加一些基础几何体
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    cube.position.set(-2, 0.5, 0)
    cube.castShadow = true
    scene.add(cube)

    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.position.set(2, 0.5, 0)
    sphere.castShadow = true
    scene.add(sphere)

    // Socket.IO连接
    const socket: Socket = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Connected to backend')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend')
      setIsConnected(false)
    })

    socket.on('user-joined', (userData: User) => {
      console.log('👤 User joined:', userData.id)
      setUsers(prev => new Map(prev.set(userData.id, userData)))
    })

    socket.on('user-left', (userId: string) => {
      console.log('👋 User left:', userId)
      setUsers(prev => {
        const newUsers = new Map(prev)
        newUsers.delete(userId)
        return newUsers
      })
    })

    socket.on('user-moved', (userData: User) => {
      setUsers(prev => new Map(prev.set(userData.id, userData)))
    })

    // 基础控制
    const keys = { w: false, a: false, s: false, d: false }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': keys.w = true; break
        case 'KeyA': keys.a = true; break
        case 'KeyS': keys.s = true; break
        case 'KeyD': keys.d = true; break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': keys.w = false; break
        case 'KeyA': keys.a = false; break
        case 'KeyS': keys.s = false; break
        case 'KeyD': keys.d = false; break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate)

      // WASD移动
      const speed = 0.1
      if (keys.w) camera.position.z -= speed
      if (keys.s) camera.position.z += speed
      if (keys.a) camera.position.x -= speed
      if (keys.d) camera.position.x += speed

      // 旋转立方体
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01

      // 浮动球体
      sphere.position.y = 0.5 + Math.sin(Date.now() * 0.001) * 0.3

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
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      socket.disconnect()
      renderer.dispose()
    }
  }, [])

  const createRoom = () => {
    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    setRoomId(newRoomId)
    setInRoom(true)
    socketRef.current?.emit('join-room', newRoomId)
  }

  const joinRoom = () => {
    if (roomId) {
      setInRoom(true)
      socketRef.current?.emit('join-room', roomId)
    }
  }

  const enterVR = async () => {
    if (!isVRSupported || !rendererRef.current) return
    
    try {
      const session = await navigator.xr?.requestSession('immersive-vr')
      if (session) {
        await rendererRef.current.xr.setSession(session)
        rendererRef.current.xr.enabled = true
      }
    } catch (error) {
      console.error('VR session failed:', error)
    }
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full" style={{ height: 'calc(100vh - 64px)' }} />
      
      {/* 控制面板 */}
      {inRoom && (
        <div className="absolute top-4 left-4 space-y-2">
          <div className="bg-black/80 px-4 py-2 rounded-lg border border-white/10">
            <div className="text-white font-mono text-sm">{roomId}</div>
          </div>
          
          <div className="bg-black/80 px-4 py-2 rounded-lg border border-white/10">
            <div className="text-white text-sm">
              在线用户: {users.size + 1}
            </div>
          </div>

          {isVRSupported && (
            <button
              onClick={enterVR}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              🥽 进入VR
            </button>
          )}
        </div>
      )}

      {/* 控制说明 */}
      {inRoom && (
        <div className="absolute bottom-4 left-4 bg-black/80 px-4 py-2 rounded-lg border border-white/10">
          <div className="text-white text-sm">
            <div>WASD: 移动</div>
            <div>鼠标: 视角</div>
          </div>
        </div>
      )}

      {/* 房间加入界面 */}
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
                  onClick={joinRoom}
                  disabled={!roomId}
                  className="absolute right-2 top-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                >
                  加入
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-400">
                  {isConnected ? '已连接到服务器' : '连接中...'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isVRSupported ? 'bg-green-400' : 'bg-gray-400'}`} />
                <span className="text-gray-400">
                  {isVRSupported ? 'WebXR支持' : 'WebXR不支持'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}