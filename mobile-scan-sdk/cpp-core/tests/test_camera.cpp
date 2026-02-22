/**
 * @file test_camera.cpp
 * @brief Unit tests for Camera interface
 */

#include <gtest/gtest.h>
#include "mobile_scan/camera.h"

using namespace mobile_scan;

class CameraTest : public ::testing::Test {
protected:
    ICamera* camera_;
    
    void SetUp() override {
        camera_ = createCamera();
        ASSERT_NE(camera_, nullptr);
    }
    
    void TearDown() override {
        if (camera_) {
            destroyCamera(camera_);
            camera_ = nullptr;
        }
    }
};

TEST_F(CameraTest, Initialize) {
    Status status = camera_->initialize(640, 480);
    EXPECT_EQ(status, Status::OK);
}

TEST_F(CameraTest, GetIntrinsics) {
    camera_->initialize(640, 480);
    
    CameraIntrinsics intrinsics;
    Status status = camera_->getIntrinsics(intrinsics);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_EQ(intrinsics.width, 640);
    EXPECT_EQ(intrinsics.height, 480);
    EXPECT_GT(intrinsics.fx, 0);
    EXPECT_GT(intrinsics.fy, 0);
}

TEST_F(CameraTest, StartStop) {
    camera_->initialize(640, 480);
    
    int frame_count = 0;
    auto callback = [](const ImageFrame& frame, void* user_data) {
        int* count = static_cast<int*>(user_data);
        (*count)++;
    };
    
    Status status = camera_->start(callback, &frame_count);
    EXPECT_EQ(status, Status::OK);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    status = camera_->stop();
    EXPECT_EQ(status, Status::OK);
    
    EXPECT_GT(frame_count, 0);
}

TEST_F(CameraTest, MultipleFrames) {
    camera_->initialize(640, 480);
    
    std::vector<int64_t> timestamps;
    auto callback = [](const ImageFrame& frame, void* user_data) {
        auto* ts = static_cast<std::vector<int64_t>*>(user_data);
        ts->push_back(frame.timestamp_ns);
    };
    
    camera_->start(callback, &timestamps);
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    camera_->stop();
    
    EXPECT_GE(timestamps.size(), 5);
    
    // Verify timestamps are increasing
    for (size_t i = 1; i < timestamps.size(); ++i) {
        EXPECT_GT(timestamps[i], timestamps[i-1]);
    }
}
