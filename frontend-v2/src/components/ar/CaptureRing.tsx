/**
 * Capture Ring Component
 * 环形拍摄轨迹可视化
 * 
 * 功能：
 * - 显示环形拍摄轨迹
 * - 标记拍摄点位状态
 * - 当前位置指示器
 * - 动画效果
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

interface CapturePoint {
  id: string
  position: [number, number, number]
  angle: number
  status: 'pending' | 'captured' | 'current'
  quality?: number
}

interface CaptureRingProps {
  center: [number, number, number]
  capturePoints: CapturePoint[]
  currentIndex: number
  radius?: number
}

export function CaptureRing({ 
  center, 
  capturePoints, 
  currentIndex, 
  radius = 2.5 
}: CaptureRingProps) {
  const ringRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  // 生成环形轨迹线条
  const ringPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 64
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = center[0] + Math.cos(angle) * radius
      const z = center[2] + Math.sin(angle) * radius
      points.push(new THREE.Vector3(x, center[1], z))
    }
    
    return points
  }, [center, radius])

  // 动画更新
  useFrame((state, delta) => {
    time.current += delta
    
    if (ringRef.current) {
      // 轻微的脉冲动画
      const scale = 1 + Math.sin(time.current * 2) * 0.02
      ringRef.current.scale.setScalar(scale)
    }
  })

  // 获取点位颜色
  function getPointColor(point: CapturePoint): string {
    switch (point.status) {
      case 'captured':
        return point.quality && point.quality > 0.8 ? '#00ff00' : '#ffff00'
      case 'current':
        return '#0080ff'
      case 'pending':
      default:
        return '#666666'
    }
  }

  // 获取点位大小
  function getPointSize(point: CapturePoint): number {
    return point.status === 'current' ? 0.15 : 0.1
  }

  return (
    <group ref={ringRef}>
      {/* 环形轨迹线 */}
      <Line
        points={ringPoints}
        color="#ffffff"
        opacity={0.6}
        transparent
        lineWidth={3}
      />
      
      {/* 拍摄点位标记 */}
      {capturePoints.map((point, index) => (
        <group key={point.id} position={point.position}>
          {/* 点位球体 */}
          <Sphere args={[getPointSize(point)]}>
            <meshBasicMaterial 
              color={getPointColor(point)}
              transparent
              opacity={0.8}
            />
          </Sphere>
          
          {/* 当前点位的脉冲效果 */}
          {point.status === 'current' && (
            <Sphere args={[0.2]}>
              <meshBasicMaterial 
                color="#0080ff"
                transparent
                opacity={0.3 + Math.sin(time.current * 4) * 0.2}
              />
            </Sphere>
          )}
          
          {/* 点位编号 */}
          <Text
            position={[0, 0.3, 0]}
            fontSize={0.2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {index + 1}
          </Text>
          
          {/* 质量指示器 */}
          {point.quality !== undefined && (
            <Text
              position={[0, -0.3, 0]}
              fontSize={0.15}
              color={point.quality > 0.8 ? '#00ff00' : '#ffff00'}
              anchorX="center"
              anchorY="middle"
            >
              {Math.round(point.quality * 100)}%
            </Text>
          )}
          
          {/* 拍摄方向指示器 */}
          <group rotation={[0, (point.angle * Math.PI) / 180, 0]}>
            <mesh position={[0, 0, -0.3]}>
              <coneGeometry args={[0.05, 0.2, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      ))}
      
      {/* 中心标记 */}
      <group position={center}>
        <Sphere args={[0.05]}>
          <meshBasicMaterial color="#ff0000" />
        </Sphere>
        
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          拍摄中心
        </Text>
      </group>
      
      {/* 进度弧线 */}
      {currentIndex > 0 && (
        <ProgressArc
          center={center}
          radius={radius}
          progress={currentIndex / capturePoints.length}
        />
      )}
    </group>
  )
}

/**
 * 进度弧线组件
 */
function ProgressArc({ 
  center, 
  radius, 
  progress 
}: { 
  center: [number, number, number]
  radius: number
  progress: number 
}) {
  const arcPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = Math.floor(64 * progress)
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / 64) * Math.PI * 2
      const x = center[0] + Math.cos(angle) * radius
      const z = center[2] + Math.sin(angle) * radius
      points.push(new THREE.Vector3(x, center[1] + 0.05, z))
    }
    
    return points
  }, [center, radius, progress])

  if (arcPoints.length < 2) return null

  return (
    <Line
      points={arcPoints}
      color="#00ff00"
      opacity={0.8}
      transparent
      lineWidth={5}
    />
  )
}