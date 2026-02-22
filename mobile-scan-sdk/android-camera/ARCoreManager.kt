package com.xrcollab.camera

import android.content.Context
import com.google.ar.core.*
import com.google.ar.core.exceptions.UnavailableException

/**
 * ARCoreManager - ARCore集成
 * 
 * 功能：
 * - ARCore会话管理
 * - 深度API（Depth API）
 * - 场景理解（Scene Understanding）
 * - 平面检测和跟踪
 */
class ARCoreManager(private val context: Context) {
    
    private var session: Session? = null
    private var config: Config? = null
    
    // 回调接口
    var onDepthImageAvailable: ((Image) -> Unit)? = null
    var onPlaneDetected: ((Plane) -> Unit)? = null
    var onError: ((Exception) -> Unit)? = null
    
    /**
     * 检查ARCore可用性
     */
    fun isARCoreSupported(): Boolean {
        return try {
            when (ArCoreApk.getInstance().checkAvailability(context)) {
                ArCoreApk.Availability.SUPPORTED_INSTALLED,
                ArCoreApk.Availability.SUPPORTED_APK_TOO_OLD,
                ArCoreApk.Availability.SUPPORTED_NOT_INSTALLED -> true
                else -> false
            }
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * 检查深度API支持
     */
    fun supportsDepth(): Boolean {
        val session = session ?: return false
        return session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
    }
    
    /**
     * 初始化ARCore会话
     */
    fun initSession(): Boolean {
        return try {
            // 创建ARCore会话
            session = Session(context)
            
            // 配置会话
            config = Config(session).apply {
                // 启用深度模式
                depthMode = if (session!!.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                    Config.DepthMode.AUTOMATIC
                } else {
                    Config.DepthMode.DISABLED
                }
                
                // 启用平面检测
                planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                
                // 启用光照估计
                lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
            }
            
            session!!.configure(config)
            true
        } catch (e: UnavailableException) {
            onError?.invoke(e)
            false
        }
    }
    
    /**
     * 更新ARCore会话
     */
    fun update(): Frame? {
        return try {
            session?.update()
        } catch (e: Exception) {
            onError?.invoke(e)
            null
        }
    }
    
    /**
     * 获取深度图像
     */
    fun acquireDepthImage(frame: Frame): Image? {
        return try {
            frame.acquireDepthImage16Bits()
        } catch (e: Exception) {
            onError?.invoke(e)
            null
        }
    }
    
    /**
     * 获取检测到的平面
     */
    fun getTrackedPlanes(frame: Frame): List<Plane> {
        return frame.getUpdatedTrackables(Plane::class.java)
            .filter { it.trackingState == TrackingState.TRACKING }
    }
    
    /**
     * 获取点云
     */
    fun acquirePointCloud(frame: Frame): PointCloud? {
        return try {
            frame.acquirePointCloud()
        } catch (e: Exception) {
            onError?.invoke(e)
            null
        }
    }
    
    /**
     * 获取ARCore会话信息
     */
    fun getSessionInfo(): Map<String, Any> {
        val session = session ?: return emptyMap()
        val config = config ?: return emptyMap()
        
        return mapOf(
            "depthMode" to config.depthMode.name,
            "planeFindingMode" to config.planeFindingMode.name,
            "lightEstimationMode" to config.lightEstimationMode.name,
            "supportsDepth" to supportsDepth()
        )
    }
    
    /**
     * 暂停会话
     */
    fun pause() {
        session?.pause()
    }
    
    /**
     * 恢复会话
     */
    fun resume() {
        try {
            session?.resume()
        } catch (e: Exception) {
            onError?.invoke(e)
        }
    }
    
    /**
     * 释放资源
     */
    fun release() {
        session?.close()
        session = null
    }
}
