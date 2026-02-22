import Foundation
import ARKit
import UIKit

struct DeviceCapability: Codable {
    let deviceModel: String
    let hasLiDAR: Bool
    let arKitVersion: String
    let arFeatures: ARFeatures
    let performance: PerformanceMetrics
    let tier: Int
    let timestamp: String
}

struct ARFeatures: Codable {
    let worldTracking: Bool
    let sceneReconstruction: Bool
    let peopleOcclusion: Bool
    let objectDetection: Bool
    let bodyTracking: Bool
    let faceTracking: Bool
}

struct PerformanceMetrics: Codable {
    let cpuCores: Int
    let totalRAM: Double
    let gpuFamily: String
}

class DeviceCapabilityDetector {
    
    static func detect() -> DeviceCapability {
        let hasLiDAR = checkLiDARSupport()
        let arFeatures = detectARFeatures()
        let performance = detectPerformance()
        let tier = calculateTier(hasLiDAR: hasLiDAR, performance: performance, arFeatures: arFeatures)
        
        return DeviceCapability(
            deviceModel: getDeviceModel(),
            hasLiDAR: hasLiDAR,
            arKitVersion: getARKitVersion(),
            arFeatures: arFeatures,
            performance: performance,
            tier: tier,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
    }
    
    private static func checkLiDARSupport() -> Bool {
        if #available(iOS 14.0, *) {
            return ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
        }
        return false
    }
    
    private static func detectARFeatures() -> ARFeatures {
        return ARFeatures(
            worldTracking: ARWorldTrackingConfiguration.isSupported,
            sceneReconstruction: {
                if #available(iOS 14.0, *) {
                    return ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
                }
                return false
            }(),
            peopleOcclusion: {
                if #available(iOS 13.0, *) {
                    return ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth)
                }
                return false
            }(),
            objectDetection: ARWorldTrackingConfiguration.supportsUserFaceTracking,
            bodyTracking: ARBodyTrackingConfiguration.isSupported,
            faceTracking: ARFaceTrackingConfiguration.isSupported
        )
    }
    
    private static func detectPerformance() -> PerformanceMetrics {
        let cpuCores = ProcessInfo.processInfo.processorCount
        let totalRAM = Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824.0
        let gpuFamily = getGPUFamily()
        
        return PerformanceMetrics(
            cpuCores: cpuCores,
            totalRAM: round(totalRAM * 100) / 100,
            gpuFamily: gpuFamily
        )
    }
    
    private static func getGPUFamily() -> String {
        let device = MTLCreateSystemDefaultDevice()
        if #available(iOS 16.0, *) {
            if device?.supportsFamily(.apple9) == true { return "Apple9+" }
            if device?.supportsFamily(.apple8) == true { return "Apple8" }
            if device?.supportsFamily(.apple7) == true { return "Apple7" }
        }
        if #available(iOS 14.0, *) {
            if device?.supportsFamily(.apple6) == true { return "Apple6" }
            if device?.supportsFamily(.apple5) == true { return "Apple5" }
        }
        return "Apple4-"
    }
    
    private static func calculateTier(hasLiDAR: Bool, performance: PerformanceMetrics, arFeatures: ARFeatures) -> Int {
        if hasLiDAR && performance.totalRAM >= 6.0 && performance.cpuCores >= 6 {
            return 3
        } else if arFeatures.peopleOcclusion && performance.totalRAM >= 4.0 {
            return 2
        } else {
            return 1
        }
    }
    
    private static func getDeviceModel() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let identifier = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0) ?? "Unknown"
            }
        }
        return identifier
    }
    
    private static func getARKitVersion() -> String {
        if #available(iOS 16.0, *) { return "6.0" }
        if #available(iOS 15.0, *) { return "5.0" }
        if #available(iOS 14.0, *) { return "4.0" }
        if #available(iOS 13.0, *) { return "3.0" }
        return "2.0"
    }
    
    static func toJSON(_ capability: DeviceCapability) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(capability),
              let json = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return json
    }
}
