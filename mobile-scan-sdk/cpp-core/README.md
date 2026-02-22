# Mobile Scan SDK - C++ Core Module

## Overview

This is the C++ core library for the Mobile Scan SDK, providing cross-platform interfaces for:

- **Camera Capture**: Real-time video frame acquisition
- **LiDAR Processing**: Depth sensor data capture (iOS)
- **Structure from Motion (SfM)**: Visual odometry and 3D reconstruction
- **Point Cloud Processing**: Merging, filtering, and export

## Architecture

```
cpp-core/
├── include/mobile_scan/     # Public C++ headers
│   ├── types.h              # Core data types
│   ├── camera.h             # Camera interface
│   ├── lidar.h              # LiDAR interface
│   ├── sfm.h                # SfM interface
│   └── pointcloud.h         # Point cloud processor
├── platform/
│   ├── ios/                 # Objective-C++ bridges
│   └── android/             # JNI bridges
├── stubs/                   # Stub implementations for testing
├── tests/                   # Google Test unit tests
└── CMakeLists.txt           # Build configuration
```

## Building

### Prerequisites

- CMake 3.20+
- C++17 compiler (GCC 9+, Clang 10+, MSVC 2019+)
- Google Test (automatically downloaded)

### Build Commands

```bash
# Configure
cmake -B build -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build build

# Run tests
cd build && ctest --output-on-failure
```

### Platform-Specific Builds

**iOS:**
```bash
cmake -B build-ios \
  -DCMAKE_SYSTEM_NAME=iOS \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DBUILD_IOS=ON \
  -DBUILD_TESTS=OFF
cmake --build build-ios
```

**Android:**
```bash
cmake -B build-android \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-24 \
  -DBUILD_ANDROID=ON
cmake --build build-android
```

## API Documentation

### Camera Interface

```cpp
#include "mobile_scan/camera.h"

ICamera* camera = createCamera();
camera->initialize(1920, 1080);
camera->start([](const ImageFrame& frame, void* user_data) {
    // Process frame
}, nullptr);
camera->stop();
destroyCamera(camera);
```

### LiDAR Interface

```cpp
#include "mobile_scan/lidar.h"

ILiDAR* lidar = createLiDAR();
if (lidar->isAvailable()) {
    lidar->initialize();
    lidar->start([](const LiDARFrame& frame, void* user_data) {
        // Process point cloud
    }, nullptr);
}
```

### SfM Interface

```cpp
#include "mobile_scan/sfm.h"

ISfM* sfm = createSfM();
sfm->initialize();

// Add frames
int32_t frame_id;
sfm->addFrame(image, intrinsics, frame_id);

// Extract features
std::vector<Keypoint> keypoints;
std::vector<Descriptor> descriptors;
sfm->extractFeatures(frame_id, keypoints, descriptors);

// Reconstruct
SfMResult result;
sfm->reconstruct(result);
```

### Point Cloud Processing

```cpp
#include "mobile_scan/pointcloud.h"

IPointCloudProcessor* processor = createPointCloudProcessor();
processor->initialize();

// Downsample
PointCloud downsampled;
processor->downsample(input, 0.05f, downsampled);

// Export
processor->exportPLY(cloud, "output.ply");
```

## iOS Integration

### Bridging Header

```objc
#import "MSCamera.h"
#import "MSLiDAR.h"

MSCamera* camera = [[MSCamera alloc] init];
[camera initializeWithWidth:1920 height:1080 error:nil];
[camera startWithCallback:^(MSCameraFrame *frame) {
    // Process frame
} error:nil];
```

### Xcode Configuration

1. Add `cpp-core` to target dependencies
2. Add framework search paths:
   ```
   $(PROJECT_DIR)/cpp-core/build-ios
   ```
3. Link frameworks:
   - AVFoundation
   - ARKit
   - CoreVideo

## Android Integration

### Gradle Configuration

```gradle
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DBUILD_ANDROID=ON"
            }
        }
    }
    externalNativeBuild {
        cmake {
            path "cpp-core/CMakeLists.txt"
        }
    }
}
```

### JNI Usage

```java
public class Camera {
    private long nativeHandle;
    
    public Camera() {
        nativeHandle = nativeCreate();
    }
    
    public void initialize(int width, int height) {
        nativeInitialize(nativeHandle, width, height);
    }
    
    private native long nativeCreate();
    private native int nativeInitialize(long handle, int width, int height);
}
```

## Testing

All interfaces have comprehensive unit tests using Google Test:

```bash
cd build
ctest --verbose
```

Test coverage:
- Camera capture lifecycle
- LiDAR data acquisition
- Feature extraction and matching
- Point cloud operations
- PLY export format

## Stub Implementations

Week 3-4 uses stub implementations that return mock data:

- **Camera**: Generates gradient pattern at 30 FPS
- **LiDAR**: Returns random point clouds at 10 Hz
- **SfM**: Mock feature extraction with 500 keypoints
- **PointCloud**: Basic filtering and export

Real implementations will be added in Week 5-8.

## Performance Notes

- Camera frames use zero-copy buffers where possible
- Point cloud operations support streaming processing
- Multi-threaded feature extraction planned for Week 5
- GPU acceleration (Metal/Vulkan) planned for Week 7

## Thread Safety

⚠️ **Current implementation is NOT thread-safe**

- Callbacks execute on internal threads
- Use proper synchronization when accessing shared state
- Thread-safe queue implementation planned for Week 5

## Memory Management

- All heap allocations use RAII patterns
- Callback data is **not owned** by the SDK
- Use `release()` to free resources explicitly
- Smart pointer wrappers planned for Week 6

## Status Codes

```cpp
enum class Status {
    OK = 0,
    ERROR_INVALID_PARAMETER = -1,
    ERROR_NOT_INITIALIZED = -2,
    ERROR_ALREADY_INITIALIZED = -3,
    ERROR_NOT_SUPPORTED = -4,
    ERROR_PERMISSION_DENIED = -5,
    ERROR_DEVICE_NOT_AVAILABLE = -6,
    ERROR_OUT_OF_MEMORY = -7,
    ERROR_INTERNAL = -100
};
```

## Troubleshooting

**Issue**: Camera not starting on iOS
- Check `Info.plist` for camera permissions
- Verify device has camera access

**Issue**: LiDAR not available
- LiDAR requires iPhone 12 Pro or newer
- Check `isAvailable()` before initialization

**Issue**: Build fails on Android
- Ensure NDK r21+ is installed
- Set `ANDROID_NDK` environment variable

## Next Steps (Week 5+)

1. Replace stubs with real implementations
2. Integrate OpenCV for feature extraction
3. Add SLAM/VIO tracking
4. Optimize memory and threading
5. Add GPU acceleration

## License

Proprietary - XR Collab Real Project 2026

## Contact

Technical questions: C++ team lead
Integration issues: Mobile team lead
