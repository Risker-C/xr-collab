/**
 * @file camera_stub.cpp
 * @brief Stub implementation of Camera interface for testing
 */

#include "mobile_scan/camera.h"
#include <cstring>
#include <thread>
#include <atomic>

namespace mobile_scan {

class CameraStub : public ICamera {
private:
    CameraIntrinsics intrinsics_;
    CameraFrameCallback callback_;
    void* user_data_;
    std::atomic<bool> running_;
    std::thread capture_thread_;
    
public:
    CameraStub() : callback_(nullptr), user_data_(nullptr), running_(false) {}
    
    ~CameraStub() override {
        release();
    }
    
    Status initialize(int32_t width, int32_t height) override {
        intrinsics_.width = width;
        intrinsics_.height = height;
        intrinsics_.fx = width * 1.2f;
        intrinsics_.fy = height * 1.2f;
        intrinsics_.cx = width / 2.0f;
        intrinsics_.cy = height / 2.0f;
        intrinsics_.k1 = 0.0f;
        intrinsics_.k2 = 0.0f;
        intrinsics_.k3 = 0.0f;
        intrinsics_.p1 = 0.0f;
        intrinsics_.p2 = 0.0f;
        return Status::OK;
    }
    
    Status start(CameraFrameCallback callback, void* user_data) override {
        if (running_) {
            return Status::ERROR_ALREADY_INITIALIZED;
        }
        
        callback_ = callback;
        user_data_ = user_data;
        running_ = true;
        
        // Simulate camera capture at 30 FPS
        capture_thread_ = std::thread([this]() {
            const int frame_size = intrinsics_.width * intrinsics_.height * 4;
            std::vector<uint8_t> frame_data(frame_size);
            
            while (running_) {
                // Generate gradient pattern
                for (int y = 0; y < intrinsics_.height; ++y) {
                    for (int x = 0; x < intrinsics_.width; ++x) {
                        int idx = (y * intrinsics_.width + x) * 4;
                        frame_data[idx + 0] = (x * 255) / intrinsics_.width;  // R
                        frame_data[idx + 1] = (y * 255) / intrinsics_.height; // G
                        frame_data[idx + 2] = 128;                             // B
                        frame_data[idx + 3] = 255;                             // A
                    }
                }
                
                ImageFrame frame;
                frame.data = frame_data.data();
                frame.width = intrinsics_.width;
                frame.height = intrinsics_.height;
                frame.stride = intrinsics_.width * 4;
                frame.format = 0; // RGBA
                frame.timestamp_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count();
                
                if (callback_) {
                    callback_(frame, user_data_);
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(33)); // ~30 FPS
            }
        });
        
        return Status::OK;
    }
    
    Status stop() override {
        running_ = false;
        if (capture_thread_.joinable()) {
            capture_thread_.join();
        }
        return Status::OK;
    }
    
    Status getIntrinsics(CameraIntrinsics& intrinsics) override {
        intrinsics = intrinsics_;
        return Status::OK;
    }
    
    void release() override {
        stop();
    }
};

ICamera* createCamera() {
    return new CameraStub();
}

void destroyCamera(ICamera* camera) {
    delete camera;
}

} // namespace mobile_scan
