/**
 * @file lidar_stub.cpp
 * @brief Stub implementation of LiDAR interface for testing
 */

#include "mobile_scan/lidar.h"
#include <thread>
#include <atomic>
#include <random>

namespace mobile_scan {

class LiDARStub : public ILiDAR {
private:
    LiDARFrameCallback callback_;
    void* user_data_;
    std::atomic<bool> running_;
    std::thread capture_thread_;
    
public:
    LiDARStub() : callback_(nullptr), user_data_(nullptr), running_(false) {}
    
    ~LiDARStub() override {
        release();
    }
    
    Status initialize() override {
        return Status::OK;
    }
    
    Status start(LiDARFrameCallback callback, void* user_data) override {
        if (running_) {
            return Status::ERROR_ALREADY_INITIALIZED;
        }
        
        callback_ = callback;
        user_data_ = user_data;
        running_ = true;
        
        // Simulate LiDAR capture at 10 Hz
        capture_thread_ = std::thread([this]() {
            std::random_device rd;
            std::mt19937 gen(rd());
            std::uniform_real_distribution<float> dis(-2.0f, 2.0f);
            
            std::vector<Point3D> points(1000);
            
            while (running_) {
                // Generate random point cloud
                for (auto& pt : points) {
                    pt.x = dis(gen);
                    pt.y = dis(gen);
                    pt.z = dis(gen) + 3.0f; // Center at 3m distance
                }
                
                LiDARFrame frame;
                frame.points = points.data();
                frame.intensities = nullptr;
                frame.point_count = points.size();
                frame.timestamp_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count();
                
                if (callback_) {
                    callback_(frame, user_data_);
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(100)); // 10 Hz
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
    
    bool isAvailable() override {
        return true; // Stub always available
    }
    
    void release() override {
        stop();
    }
};

ILiDAR* createLiDAR() {
    return new LiDARStub();
}

void destroyLiDAR(ILiDAR* lidar) {
    delete lidar;
}

} // namespace mobile_scan
