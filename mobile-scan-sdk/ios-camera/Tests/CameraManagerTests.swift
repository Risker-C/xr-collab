import XCTest
@testable import IOSCamera

final class CameraManagerTests: XCTestCase {
    var cameraManager: CameraManager!
    
    override func setUp() {
        super.setUp()
        cameraManager = CameraManager()
    }
    
    override func tearDown() {
        cameraManager = nil
        super.tearDown()
    }
    
    func testCameraSetup() throws {
        XCTAssertNoThrow(try cameraManager.setup())
    }
    
    func testCameraStartStop() throws {
        try cameraManager.setup()
        cameraManager.start()
        cameraManager.stop()
    }
    
    func testPhotoCapture() throws {
        try cameraManager.setup()
        cameraManager.start()
        
        let expectation = expectation(description: "Photo captured")
        cameraManager.onPhotoCapture = { data in
            XCTAssertNotNil(data)
            expectation.fulfill()
        }
        
        cameraManager.capturePhoto()
        waitForExpectations(timeout: 5)
    }
}

final class ARKitManagerTests: XCTestCase {
    var arKitManager: ARKitManager!
    
    override func setUp() {
        super.setUp()
        arKitManager = ARKitManager()
    }
    
    override func tearDown() {
        arKitManager = nil
        super.tearDown()
    }
    
    func testARSetup() {
        XCTAssertNoThrow(arKitManager.setup())
    }
    
    func testLiDARDetection() {
        let hasLiDAR = arKitManager.hasLiDAR()
        XCTAssertNotNil(hasLiDAR)
    }
    
    func testWorldMapCapture() {
        arKitManager.setup()
        arKitManager.start()
        
        let expectation = expectation(description: "World map captured")
        arKitManager.captureWorldMap { worldMap in
            expectation.fulfill()
        }
        
        waitForExpectations(timeout: 5)
    }
}
