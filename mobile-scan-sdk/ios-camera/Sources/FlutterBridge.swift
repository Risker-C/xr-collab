import Flutter
import UIKit

class FlutterBridge: NSObject, FlutterPlugin {
    private let cameraManager = CameraManager()
    private let arKitManager = ARKitManager()
    private var channel: FlutterMethodChannel?
    
    static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "xr_collab/camera", binaryMessenger: registrar.messenger())
        let instance = FlutterBridge()
        instance.channel = channel
        registrar.addMethodCallDelegate(instance, channel: channel)
    }
    
    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "initCamera":
            initCamera(result: result)
        case "startCamera":
            startCamera(result: result)
        case "stopCamera":
            stopCamera(result: result)
        case "capturePhoto":
            capturePhoto(result: result)
        case "initAR":
            initAR(result: result)
        case "startAR":
            startAR(result: result)
        case "stopAR":
            stopAR(result: result)
        case "hasLiDAR":
            result(arKitManager.hasLiDAR())
        case "captureWorldMap":
            captureWorldMap(result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }
    
    private func initCamera(result: @escaping FlutterResult) {
        do {
            try cameraManager.setup()
            cameraManager.onPhotoCapture = { [weak self] data in
                self?.channel?.invokeMethod("onPhotoCapture", arguments: data)
            }
            result(nil)
        } catch {
            result(FlutterError(code: "INIT_ERROR", message: error.localizedDescription, details: nil))
        }
    }
    
    private func startCamera(result: @escaping FlutterResult) {
        cameraManager.start()
        result(nil)
    }
    
    private func stopCamera(result: @escaping FlutterResult) {
        cameraManager.stop()
        result(nil)
    }
    
    private func capturePhoto(result: @escaping FlutterResult) {
        cameraManager.capturePhoto()
        result(nil)
    }
    
    private func initAR(result: @escaping FlutterResult) {
        arKitManager.setup()
        arKitManager.onDepthData = { [weak self] depthData in
            self?.channel?.invokeMethod("onDepthData", arguments: [
                "width": depthData.depthMap.width,
                "height": depthData.depthMap.height
            ])
        }
        result(nil)
    }
    
    private func startAR(result: @escaping FlutterResult) {
        arKitManager.start()
        result(nil)
    }
    
    private func stopAR(result: @escaping FlutterResult) {
        arKitManager.stop()
        result(nil)
    }
    
    private func captureWorldMap(result: @escaping FlutterResult) {
        arKitManager.captureWorldMap { worldMap in
            result(worldMap != nil)
        }
    }
}
