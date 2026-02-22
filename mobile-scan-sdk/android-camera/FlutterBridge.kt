package com.xrcollab.camera

import android.app.Activity
import androidx.lifecycle.LifecycleOwner
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import java.io.File

/**
 * FlutterBridge - Flutter Method Channel桥接
 * 
 * 提供给Flutter的API方法：
 * - initCamera(): 初始化相机
 * - capturePhoto(): 拍照
 * - supportsARCore(): 检查ARCore支持
 * - supportsDepth(): 检查深度API支持
 * - getCameraInfo(): 获取相机信息
 * - release(): 释放资源
 * 
 * 事件流：
 * - photoCapture: 拍照完成事件
 * - frameAvailable: 帧可用事件
 * - error: 错误事件
 */
class FlutterBridge : FlutterPlugin, MethodCallHandler {
    
    private lateinit var channel: MethodChannel
    private lateinit var eventChannel: io.flutter.plugin.common.EventChannel
    private var cameraManager: CameraManager? = null
    private var arCoreManager: ARCoreManager? = null
    private var activity: Activity? = null
    
    companion object {
        private const val METHOD_CHANNEL = "xr_collab/camera"
        private const val EVENT_CHANNEL = "xr_collab/camera/events"
    }
    
    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        // Method Channel
        channel = MethodChannel(binding.binaryMessenger, METHOD_CHANNEL)
        channel.setMethodCallHandler(this)
        
        // Event Channel
        eventChannel = io.flutter.plugin.common.EventChannel(binding.binaryMessenger, EVENT_CHANNEL)
        eventChannel.setStreamHandler(object : io.flutter.plugin.common.EventChannel.StreamHandler {
            private var eventSink: io.flutter.plugin.common.EventChannel.EventSink? = null
            
            override fun onListen(arguments: Any?, events: io.flutter.plugin.common.EventChannel.EventSink?) {
                eventSink = events
                setupCameraCallbacks(eventSink)
            }
            
            override fun onCancel(arguments: Any?) {
                eventSink = null
            }
        })
        
        // 初始化管理器
        cameraManager = CameraManager(binding.applicationContext)
        arCoreManager = ARCoreManager(binding.applicationContext)
    }
    
    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
        cameraManager?.release()
        arCoreManager?.release()
    }
    
    override fun onMethodCall(call: MethodCall, result: Result) {
        when (call.method) {
            "initCamera" -> {
                initCamera(result)
            }
            "capturePhoto" -> {
                capturePhoto(result)
            }
            "supportsARCore" -> {
                result.success(arCoreManager?.isARCoreSupported() ?: false)
            }
            "supportsDepth" -> {
                result.success(arCoreManager?.supportsDepth() ?: false)
            }
            "getCameraInfo" -> {
                result.success(cameraManager?.getCameraInfo() ?: emptyMap<String, Any>())
            }
            "getARCoreInfo" -> {
                result.success(arCoreManager?.getSessionInfo() ?: emptyMap<String, Any>())
            }
            "release" -> {
                cameraManager?.release()
                arCoreManager?.release()
                result.success(null)
            }
            else -> {
                result.notImplemented()
            }
        }
    }
    
    private fun initCamera(result: Result) {
        val activity = this.activity
        if (activity == null) {
            result.error("NO_ACTIVITY", "Activity not available", null)
            return
        }
        
        if (!cameraManager!!.hasPermissions()) {
            result.error("NO_PERMISSION", "Camera permission not granted", null)
            return
        }
        
        // 这里需要实际的Surface Provider
        // 在实际应用中，需要从Flutter UI获取TextureID
        result.success(true)
    }
    
    private fun capturePhoto(result: Result) {
        val outputDir = activity?.cacheDir
        if (outputDir == null) {
            result.error("NO_OUTPUT_DIR", "Output directory not available", null)
            return
        }
        
        cameraManager?.capturePhoto(outputDir)
        result.success(true)
    }
    
    private fun setupCameraCallbacks(eventSink: io.flutter.plugin.common.EventChannel.EventSink?) {
        cameraManager?.onPhotoCapture = { file ->
            eventSink?.success(mapOf(
                "type" to "photoCapture",
                "path" to file.absolutePath
            ))
        }
        
        cameraManager?.onError = { error ->
            eventSink?.error("CAMERA_ERROR", error.message, error.stackTraceToString())
        }
        
        arCoreManager?.onError = { error ->
            eventSink?.error("ARCORE_ERROR", error.message, error.stackTraceToString())
        }
    }
    
    fun setActivity(activity: Activity) {
        this.activity = activity
    }
}
