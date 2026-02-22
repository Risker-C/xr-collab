/**
 * @file test_pointcloud.cpp
 * @brief Unit tests for PointCloud processor
 */

#include <gtest/gtest.h>
#include "mobile_scan/pointcloud.h"
#include <cstdio>

using namespace mobile_scan;

class PointCloudTest : public ::testing::Test {
protected:
    IPointCloudProcessor* processor_;
    
    void SetUp() override {
        processor_ = createPointCloudProcessor();
        ASSERT_NE(processor_, nullptr);
        processor_->initialize();
    }
    
    void TearDown() override {
        if (processor_) {
            destroyPointCloudProcessor(processor_);
            processor_ = nullptr;
        }
    }
    
    PointCloud createTestCloud(int num_points) {
        PointCloud cloud;
        cloud.points.resize(num_points);
        
        for (int i = 0; i < num_points; ++i) {
            cloud.points[i].position.x = i * 0.1f;
            cloud.points[i].position.y = i * 0.1f;
            cloud.points[i].position.z = i * 0.1f;
            cloud.points[i].color.r = 255;
            cloud.points[i].color.g = 128;
            cloud.points[i].color.b = 64;
            cloud.points[i].confidence = 1.0f;
        }
        
        return cloud;
    }
};

TEST_F(PointCloudTest, Merge) {
    PointCloud cloud1 = createTestCloud(100);
    PointCloud cloud2 = createTestCloud(50);
    
    PointCloud clouds[] = {cloud1, cloud2};
    PointCloud merged;
    
    Status status = processor_->merge(clouds, 2, merged);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_EQ(merged.points.size(), 150);
}

TEST_F(PointCloudTest, Downsample) {
    PointCloud input = createTestCloud(1000);
    PointCloud output;
    
    Status status = processor_->downsample(input, 0.1f, output);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_LT(output.points.size(), input.points.size());
    EXPECT_GT(output.points.size(), 0);
}

TEST_F(PointCloudTest, RemoveOutliers) {
    PointCloud input = createTestCloud(100);
    PointCloud output;
    
    Status status = processor_->removeOutliers(input, 10, 1.0f, output);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_LE(output.points.size(), input.points.size());
}

TEST_F(PointCloudTest, Transform) {
    PointCloud input = createTestCloud(100);
    
    Pose pose;
    pose.position.x = 1.0f;
    pose.position.y = 2.0f;
    pose.position.z = 3.0f;
    
    PointCloud output;
    Status status = processor_->transform(input, pose, output);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_EQ(output.points.size(), input.points.size());
    
    // Verify translation applied
    EXPECT_FLOAT_EQ(output.points[0].position.x, 
                    input.points[0].position.x + pose.position.x);
}

TEST_F(PointCloudTest, ExportPLY) {
    PointCloud cloud = createTestCloud(10);
    const char* path = "/tmp/test_cloud.ply";
    
    Status status = processor_->exportPLY(cloud, path);
    
    EXPECT_EQ(status, Status::OK);
    
    // Verify file exists
    FILE* file = fopen(path, "r");
    ASSERT_NE(file, nullptr);
    fclose(file);
    
    // Cleanup
    std::remove(path);
}
