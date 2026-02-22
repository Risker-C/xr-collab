import SwiftUI
import AVFoundation

struct CameraPreviewView: UIViewRepresentable {
    let cameraManager: CameraManager
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        let previewLayer = cameraManager.getPreviewLayer()
        previewLayer.frame = view.bounds
        view.layer.addSublayer(previewLayer)
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let layer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            layer.frame = uiView.bounds
        }
    }
}

struct CameraView: View {
    @StateObject private var viewModel = CameraViewModel()
    
    var body: some View {
        ZStack {
            CameraPreviewView(cameraManager: viewModel.cameraManager)
                .ignoresSafeArea()
            
            VStack {
                Spacer()
                Button(action: viewModel.capturePhoto) {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 70, height: 70)
                        .overlay(Circle().stroke(Color.gray, lineWidth: 2))
                }
                .padding(.bottom, 40)
            }
        }
        .onAppear(perform: viewModel.start)
        .onDisappear(perform: viewModel.stop)
    }
}

class CameraViewModel: ObservableObject {
    let cameraManager = CameraManager()
    
    func start() {
        try? cameraManager.setup()
        cameraManager.start()
    }
    
    func stop() {
        cameraManager.stop()
    }
    
    func capturePhoto() {
        cameraManager.capturePhoto()
    }
}
