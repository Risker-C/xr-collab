/**
 * @file test_lidar.cpp
 * @brief Unit tests for LiDAR interface
 */

#include <gtest/gtest.h>
#include "mobile_scan/lidar.h"

using namespace mobile_scan;

class LiDARTest : public ::testing::Test {
protected:
    ILiDAR* lidar_;
    
    void SetUp() override {
        lidar_ = createLiDAR();
        ASSERT_NE(lidar_, nullptr);
    }
    
    void TearDown() override {
        if (lidar_) {
            destroyLiDAR(lidar_);
            lidar_ = nullptr;
        }
    }
};

TEST_F(LiDARTest, Initialize) {
    Status status = lidar_->initialize();
    EXPECT_EQ(status, Status::OK);
}

TEST_F(LiDARTest, IsAvailable) {
    EXPECT_TRUE(lidar_->isAvailable());
}

TEST_F(LiDARTest, CaptureFrames) {
    lidar_->initialize();
    
    int frame_count = 0;
    auto callback = [](const LiDARFrame& frame, void* user_data) {
        int* count = static_cast<int*>(user_data);
        (*count)++;
        
        EXPECT_GT(frame.point_count, 0);
        EXPECT_NE(frame.points, nullptr);
    };
    
    Status status = lidar_->start(callback, &frame_count);
    EXPECT_EQ(status, Status::OK);
    
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    lidar_->stop();
    
    EXPECT_GT(frame_count, 0);
}

TEST_F(LiDARTest, PointCloudData) {
    lidar_->initialize();
    
    std::vector<Point3D> captured_points;
    auto callback = [](const LiDARFrame& frame, void* user_data) {
        auto* points = static_cast<std::vector<Point3D>*>(user_data);
        for (int i = 0; i < frame.point_count; ++i) {
            points->push_back(frame.points[i]);
        }
    };
    
    lidar_->start(callback, &captured_points);
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    lidar_->stop();
    
    EXPECT_GT(captured_points.size(), 0);
}
