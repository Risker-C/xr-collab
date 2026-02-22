import SwiftUI

struct ContentView: View {
    @State private var capability: DeviceCapability?
    @State private var jsonOutput: String = ""
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Device Capability Detector")
                    .font(.title)
                    .bold()
                
                Button("Detect Device") {
                    detectDevice()
                }
                .buttonStyle(.borderedProminent)
                .padding()
                
                if let cap = capability {
                    VStack(alignment: .leading, spacing: 15) {
                        InfoRow(label: "Device", value: cap.deviceModel)
                        InfoRow(label: "Tier", value: "\(cap.tier)")
                        InfoRow(label: "LiDAR", value: cap.hasLiDAR ? "✓" : "✗")
                        InfoRow(label: "ARKit", value: cap.arKitVersion)
                        InfoRow(label: "CPU Cores", value: "\(cap.performance.cpuCores)")
                        InfoRow(label: "RAM", value: String(format: "%.2f GB", cap.performance.totalRAM))
                        InfoRow(label: "GPU", value: cap.performance.gpuFamily)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
                    
                    Text("JSON Output:")
                        .font(.headline)
                    
                    Text(jsonOutput)
                        .font(.system(.caption, design: .monospaced))
                        .padding()
                        .background(Color.black.opacity(0.05))
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }
    
    private func detectDevice() {
        capability = DeviceCapabilityDetector.detect()
        if let cap = capability {
            jsonOutput = DeviceCapabilityDetector.toJSON(cap)
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label + ":")
                .bold()
            Spacer()
            Text(value)
        }
    }
}
