'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from '@/lib/config'
import { VRSettings } from '@/components/VRSettings'

interface User {
  id: string
  position: THREE.Vector3
  rotation: THREE.Euler
  color: string
}

const ControlsHelp = () => (
  <div className="bg-black/80 p-4 rounded-lg border border-white/10">
    <h3 className="text-white font-bold mb-2">VR控制</h3>
    <ul className="text-gray-300 text-sm space-y-1">
      <li>🎮 使用VR控制器移动</li>
      <li>👆 点击抓取物体</li>
      <li>🔄 旋转控制器旋转物体</li>
      <li>📍 传送移动到远处</li>
    </ul>

    <h3 className="text-white font-bold mb-2 mt-4">桌面控制</h3>
    <ul className="text-gray-300 text-sm space-y-1">
      <li>WASD - 移动</li>
      <li>鼠标拖拽 - 旋转视角</li>
      <li>点击 - 选择物体</li>
      <li>滚轮 - 缩放</li>
    </ul>
  </div>
)

export default function VRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const socketRef = useRef<Socket | null>(null)
  
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [roomId, setRoomId] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [users, setUsers] = useState<Map<string, User>>(new Map())
  const [isVRSupported, setIsVRSupported] = useState(false)
  const [vrError, setVrError] = useState<string | null>(null)

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
      setConnectionStatus('connected')
      setErrorMessage('')
    })

    socket.on('connect_error', () => {
      setConnectionStatus('error')
      setErrorMessage('无法连接到服务器，请检查网络连接')
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend')
      setConnectionStatus('connecting')
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

    // 鼠标拖拽旋转 + 滚轮缩放（桌面）
    camera.rotation.order = 'YXZ'
    let isDragging = false
    let lastX = 0
    let lastY = 0

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - lastX
      const deltaY = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      camera.rotation.y -= deltaX * 0.005
      camera.rotation.x -= deltaY * 0.005
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x))
    }

    const handleMouseUp = () => {
      isDragging = false
    }

    const handleWheel = (e: WheelEvent) => {
      camera.position.z += e.deltaY * 0.01
      camera.position.z = Math.max(1, Math.min(20, camera.position.z))
    }

    canvasRef.current.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('wheel', handleWheel, { passive: true })

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
      canvasRef.current?.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('wheel', handleWheel)
      socket.disconnect()
      renderer.dispose()
    }
  }, [])

  const reconnect = () => {
    setErrorMessage('')
    setConnectionStatus('connecting')
    socketRef.current?.connect()
  }

  const createRoom = () => {
    if (connectionStatus !== 'connected') {
      setErrorMessage('当前未连接到服务器，无法创建房间')
      return
    }

    const newRoomId = 'ROOM-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    setRoomId(newRoomId)
    setInRoom(true)
    socketRef.current?.emit('join-room', newRoomId)
  }

  const joinRoom = () => {
    if (connectionStatus !== 'connected') {
      setErrorMessage('当前未连接到服务器，无法加入房间')
      return
    }

    if (roomId) {
      setInRoom(true)
      socketRef.current?.emit('join-room', roomId)
    }
  }

  const dismissError = () => setVrError(null)

  const enterVR = async () => {
    setVrError(null)

    if (!navigator.xr) {
      setVrError('您的浏览器不支持WebXR')
      return
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr')
      if (!supported) {
        setVrError('您的设备不支持VR模式')
        return
      }

      if (!rendererRef.current) {
        setVrError('VR渲染器未就绪')
        return
      }

      const session = await navigator.xr.requestSession('immersive-vr')
      await rendererRef.current.xr.setSession(session)
      rendererRef.current.xr.enabled = true
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      setVrError(`VR启动失败: ${message}`)
    }
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full" style={{ height: 'calc(100vh - 64px)' }} />
      
      {/* 控制面板 */}
      {inRoom && (
        <div className="absolute top-4 left-4 space-y-3">
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
              aria-label="进入VR协作模式"
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              🥽 进入VR
            </button>
          )}

          <ControlsHelp />
        </div>
      )}

      {inRoom && (
        <div className="absolute top-4 right-4 w-80 space-y-4">
          <VRSettings />
          {vrError && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400 font-bold">VR模式启动失败</p>
              <p className="text-gray-300 text-sm mt-2">{vrError}</p>
              <button
                onClick={dismissError}
                className="mt-2 text-red-400 underline"
                aria-label="关闭VR错误提示"
              >
                关闭
              </button>
            </div>
          )}
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
                aria-label="创建新的VR房间"
                disabled={connectionStatus !== 'connected'}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                创建新房间
              </button>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="输入房间ID加入"
                  aria-label="输入房间ID"
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
                <button
                  onClick={joinRoom}
                  aria-label="加入房间"
                  disabled={!roomId || connectionStatus !== 'connected'}
                  className="absolute right-2 top-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                >
                  加入
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-400'
                      : connectionStatus === 'error'
                      ? 'bg-red-400'
                      : 'bg-yellow-400'
                  }`}
                />
                <span className="text-gray-400">
                  {connectionStatus === 'connected'
                    ? '已连接到服务器'
                    : connectionStatus === 'error'
                    ? '连接失败'
                    : '连接中...'}
                </span>
              </div>

              {connectionStatus === 'error' && (
                <div className="text-sm text-red-400">
                  <span>{errorMessage}</span>
                  <button
                    onClick={reconnect}
                    className="ml-2 underline"
                    aria-label="重新连接服务器"
                  >
                    重新连接
                  </button>
                </div>
              )}
              
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