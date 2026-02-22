import ARKit
import RealityKit

class ARKitManager: NSObject {
    private let session = ARSession()
    private var sceneReconstruction: ARWorldMap?
    
    var onDepthData: ((ARDepthData) -> Void)?
    var onSceneUpdate: (([ARAnchor]) -> Void)?
    
    func setup() {
        session.delegate = self
    }
    
    func start() {
        let config = ARWorldTrackingConfiguration()
        
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics.insert(.sceneDepth)
        }
        
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
        }
        
        config.planeDetection = [.horizontal, .vertical]
        session.run(config)
    }
    
    func stop() {
        session.pause()
    }
    
    func captureWorldMap(completion: @escaping (ARWorldMap?) -> Void) {
        session.getCurrentWorldMap { worldMap, error in
            completion(worldMap)
        }
    }
    
    func hasLiDAR() -> Bool {
        ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    }
    
    func getDepthData(from frame: ARFrame) -> ARDepthData? {
        frame.sceneDepth
    }
}

extension ARKitManager: ARSessionDelegate {
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        if let depthData = frame.sceneDepth {
            onDepthData?(depthData)
        }
    }
    
    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        onSceneUpdate?(anchors)
    }
    
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        onSceneUpdate?(anchors)
    }
}
