/**
 * @file test_sfm.cpp
 * @brief Unit tests for SfM interface
 */

#include <gtest/gtest.h>
#include "mobile_scan/sfm.h"

using namespace mobile_scan;

class SfMTest : public ::testing::Test {
protected:
    ISfM* sfm_;
    
    void SetUp() override {
        sfm_ = createSfM();
        ASSERT_NE(sfm_, nullptr);
        sfm_->initialize();
    }
    
    void TearDown() override {
        if (sfm_) {
            destroySfM(sfm_);
            sfm_ = nullptr;
        }
    }
};

TEST_F(SfMTest, AddFrame) {
    ImageFrame frame;
    frame.width = 640;
    frame.height = 480;
    
    CameraIntrinsics intrinsics;
    intrinsics.width = 640;
    intrinsics.height = 480;
    intrinsics.fx = 500;
    intrinsics.fy = 500;
    intrinsics.cx = 320;
    intrinsics.cy = 240;
    
    int32_t frame_id;
    Status status = sfm_->addFrame(frame, intrinsics, frame_id);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_GE(frame_id, 0);
}

TEST_F(SfMTest, ExtractFeatures) {
    ImageFrame frame;
    frame.width = 640;
    frame.height = 480;
    
    CameraIntrinsics intrinsics;
    intrinsics.width = 640;
    intrinsics.height = 480;
    
    int32_t frame_id;
    sfm_->addFrame(frame, intrinsics, frame_id);
    
    std::vector<Keypoint> keypoints;
    std::vector<Descriptor> descriptors;
    
    Status status = sfm_->extractFeatures(frame_id, keypoints, descriptors);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_GT(keypoints.size(), 0);
    EXPECT_EQ(keypoints.size(), descriptors.size());
}

TEST_F(SfMTest, MatchFeatures) {
    ImageFrame frame1, frame2;
    frame1.width = frame2.width = 640;
    frame1.height = frame2.height = 480;
    
    CameraIntrinsics intrinsics;
    intrinsics.width = 640;
    intrinsics.height = 480;
    
    int32_t frame_id_1, frame_id_2;
    sfm_->addFrame(frame1, intrinsics, frame_id_1);
    sfm_->addFrame(frame2, intrinsics, frame_id_2);
    
    std::vector<Keypoint> kp1, kp2;
    std::vector<Descriptor> desc1, desc2;
    
    sfm_->extractFeatures(frame_id_1, kp1, desc1);
    sfm_->extractFeatures(frame_id_2, kp2, desc2);
    
    std::vector<FeatureMatch> matches;
    Status status = sfm_->matchFeatures(frame_id_1, frame_id_2, matches);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_GT(matches.size(), 0);
}

TEST_F(SfMTest, EstimatePose) {
    ImageFrame frame1, frame2;
    CameraIntrinsics intrinsics;
    
    int32_t frame_id_1, frame_id_2;
    sfm_->addFrame(frame1, intrinsics, frame_id_1);
    sfm_->addFrame(frame2, intrinsics, frame_id_2);
    
    std::vector<Keypoint> kp1, kp2;
    std::vector<Descriptor> desc1, desc2;
    sfm_->extractFeatures(frame_id_1, kp1, desc1);
    sfm_->extractFeatures(frame_id_2, kp2, desc2);
    
    std::vector<FeatureMatch> matches;
    sfm_->matchFeatures(frame_id_1, frame_id_2, matches);
    
    Pose relative_pose;
    Status status = sfm_->estimatePose(frame_id_1, frame_id_2, matches, relative_pose);
    
    EXPECT_EQ(status, Status::OK);
}

TEST_F(SfMTest, Reconstruct) {
    // Add multiple frames
    for (int i = 0; i < 5; ++i) {
        ImageFrame frame;
        CameraIntrinsics intrinsics;
        int32_t frame_id;
        sfm_->addFrame(frame, intrinsics, frame_id);
    }
    
    SfMResult result;
    Status status = sfm_->reconstruct(result);
    
    EXPECT_EQ(status, Status::OK);
    EXPECT_GT(result.camera_poses.size(), 0);
    EXPECT_GT(result.reconstructed_points.points.size(), 0);
}
