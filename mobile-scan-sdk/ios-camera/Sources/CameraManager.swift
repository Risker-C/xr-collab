import AVFoundation
import UIKit

class CameraManager: NSObject {
    private let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var videoOutput = AVCaptureVideoDataOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    
    var onFrameCapture: ((CVPixelBuffer) -> Void)?
    var onPhotoCapture: ((Data?) -> Void)?
    
    func setup() throws {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw NSError(domain: "CameraManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No camera available"])
        }
        
        let input = try AVCaptureDeviceInput(device: device)
        
        session.beginConfiguration()
        session.sessionPreset = .photo
        
        if session.canAddInput(input) { session.addInput(input) }
        if session.canAddOutput(photoOutput) { session.addOutput(photoOutput) }
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "camera.frame"))
        }
        
        session.commitConfiguration()
    }
    
    func start() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }
    
    func stop() {
        session.stopRunning()
    }
    
    func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
    
    func getPreviewLayer() -> AVCaptureVideoPreviewLayer {
        if previewLayer == nil {
            previewLayer = AVCaptureVideoPreviewLayer(session: session)
            previewLayer?.videoGravity = .resizeAspectFill
        }
        return previewLayer!
    }
}

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        onFrameCapture?(pixelBuffer)
    }
}

extension CameraManager: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        onPhotoCapture?(photo.fileDataRepresentation())
    }
}
