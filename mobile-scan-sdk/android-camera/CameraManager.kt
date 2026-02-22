package com.xrcollab.camera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * CameraManager - Android相机管理
 * 
 * 功能：
 * - CameraX相机初始化和配置
 * - 拍照和视频预览
 * - 帧回调（用于实时处理）
 * - 相机权限检查
 */
class CameraManager(private val context: Context) {
    
    private var imageCapture: ImageCapture? = null
    private var preview: Preview? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    
    // 回调接口
    var onPhotoCapture: ((File) -> Unit)? = null
    var onError: ((Exception) -> Unit)? = null
    var onFrameAvailable: ((ImageProxy) -> Unit)? = null
    
    /**
     * 检查相机权限
     */
    fun hasPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * 初始化相机
     */
    fun initCamera(
        lifecycleOwner: LifecycleOwner,
        surfaceProvider: Preview.SurfaceProvider
    ) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases(lifecycleOwner, surfaceProvider)
            } catch (e: Exception) {
                onError?.invoke(e)
            }
        }, ContextCompat.getMainExecutor(context))
    }
    
    /**
     * 绑定相机用例
     */
    private fun bindCameraUseCases(
        lifecycleOwner: LifecycleOwner,
        surfaceProvider: Preview.SurfaceProvider
    ) {
        val cameraProvider = cameraProvider ?: return
        
        // 预览用例
        preview = Preview.Builder()
            .build()
            .also {
                it.setSurfaceProvider(surfaceProvider)
            }
        
        // 拍照用例
        imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .build()
        
        // 图像分析用例（帧回调）
        val imageAnalyzer = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
            .also {
                it.setAnalyzer(cameraExecutor) { image ->
                    onFrameAvailable?.invoke(image)
                    image.close()
                }
            }
        
        // 选择后置摄像头
        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
        
        try {
            // 解绑所有用例
            cameraProvider.unbindAll()
            
            // 绑定用例到相机
            camera = cameraProvider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageCapture,
                imageAnalyzer
            )
        } catch (e: Exception) {
            onError?.invoke(e)
        }
    }
    
    /**
     * 拍照
     */
    fun capturePhoto(outputDirectory: File) {
        val imageCapture = imageCapture ?: return
        
        val photoFile = File(
            outputDirectory,
            "photo_${System.currentTimeMillis()}.jpg"
        )
        
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        
        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    onPhotoCapture?.invoke(photoFile)
                }
                
                override fun onError(exception: ImageCaptureException) {
                    onError?.invoke(exception)
                }
            }
        )
    }
    
    /**
     * 释放资源
     */
    fun release() {
        cameraExecutor.shutdown()
        cameraProvider?.unbindAll()
    }
    
    /**
     * 获取相机信息
     */
    fun getCameraInfo(): Map<String, Any> {
        val camera = camera ?: return emptyMap()
        
        return mapOf(
            "hasFlashUnit" to camera.cameraInfo.hasFlashUnit(),
            "sensorRotationDegrees" to camera.cameraInfo.sensorRotationDegrees,
            "lensFacing" to camera.cameraInfo.lensFacing
        )
    }
}
