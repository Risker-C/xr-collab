/**
 * @file sfm_stub.cpp
 * @brief Stub implementation of SfM interface for testing
 */

#include "mobile_scan/sfm.h"
#include <map>
#include <random>

namespace mobile_scan {

class SfMStub : public ISfM {
private:
    std::map<int32_t, ImageFrame> frames_;
    std::map<int32_t, std::vector<Keypoint>> keypoints_;
    std::map<int32_t, std::vector<Descriptor>> descriptors_;
    int32_t next_frame_id_;
    
public:
    SfMStub() : next_frame_id_(0) {}
    
    ~SfMStub() override {
        release();
    }
    
    Status initialize() override {
        return Status::OK;
    }
    
    Status addFrame(const ImageFrame& frame, 
                   const CameraIntrinsics& intrinsics,
                   int32_t& frame_id) override {
        frame_id = next_frame_id_++;
        frames_[frame_id] = frame;
        return Status::OK;
    }
    
    Status extractFeatures(int32_t frame_id,
                          std::vector<Keypoint>& keypoints,
                          std::vector<Descriptor>& descriptors) override {
        if (frames_.find(frame_id) == frames_.end()) {
            return Status::ERROR_INVALID_PARAMETER;
        }
        
        // Generate mock features
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_real_distribution<float> x_dis(0, frames_[frame_id].width);
        std::uniform_real_distribution<float> y_dis(0, frames_[frame_id].height);
        std::uniform_real_distribution<float> desc_dis(0, 1.0f);
        
        const int num_features = 500;
        keypoints.resize(num_features);
        descriptors.resize(num_features);
        
        for (int i = 0; i < num_features; ++i) {
            keypoints[i].position.x = x_dis(gen);
            keypoints[i].position.y = y_dis(gen);
            keypoints[i].response = 1.0f;
            keypoints[i].scale = 1.0f;
            keypoints[i].orientation = 0.0f;
            
            for (int j = 0; j < Descriptor::DESCRIPTOR_SIZE; ++j) {
                descriptors[i].data[j] = desc_dis(gen);
            }
        }
        
        keypoints_[frame_id] = keypoints;
        descriptors_[frame_id] = descriptors;
        
        return Status::OK;
    }
    
    Status matchFeatures(int32_t frame_id_1, 
                        int32_t frame_id_2,
                        std::vector<FeatureMatch>& matches) override {
        if (keypoints_.find(frame_id_1) == keypoints_.end() ||
            keypoints_.find(frame_id_2) == keypoints_.end()) {
            return Status::ERROR_INVALID_PARAMETER;
        }
        
        // Generate mock matches (assume 60% match rate)
        const int num_matches = std::min(
            keypoints_[frame_id_1].size(),
            keypoints_[frame_id_2].size()
        ) * 0.6f;
        
        matches.resize(num_matches);
        for (int i = 0; i < num_matches; ++i) {
            matches[i].keypoint_index_1 = i;
            matches[i].keypoint_index_2 = i;
            matches[i].distance = 0.5f;
        }
        
        return Status::OK;
    }
    
    Status estimatePose(int32_t frame_id_1,
                       int32_t frame_id_2,
                       const std::vector<FeatureMatch>& matches,
                       Pose& relative_pose) override {
        // Return identity pose with small translation
        relative_pose.position.x = 0.1f;
        relative_pose.position.y = 0.0f;
        relative_pose.position.z = 0.0f;
        relative_pose.orientation.x = 0.0f;
        relative_pose.orientation.y = 0.0f;
        relative_pose.orientation.z = 0.0f;
        relative_pose.orientation.w = 1.0f;
        relative_pose.timestamp_ns = 0;
        
        return Status::OK;
    }
    
    Status reconstruct(SfMResult& result) override {
        // Generate mock reconstruction
        result.camera_poses.resize(frames_.size());
        
        for (size_t i = 0; i < result.camera_poses.size(); ++i) {
            result.camera_poses[i].position.x = i * 0.1f;
            result.camera_poses[i].position.y = 0.0f;
            result.camera_poses[i].position.z = 0.0f;
            result.camera_poses[i].orientation = Quaternion();
        }
        
        // Generate mock point cloud
        result.reconstructed_points.points.resize(1000);
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_real_distribution<float> dis(-1.0f, 1.0f);
        
        for (auto& pt : result.reconstructed_points.points) {
            pt.position.x = dis(gen);
            pt.position.y = dis(gen);
            pt.position.z = dis(gen);
            pt.color.r = 128;
            pt.color.g = 128;
            pt.color.b = 128;
            pt.confidence = 0.8f;
        }
        
        result.reprojection_error = 0.5f;
        
        return Status::OK;
    }
    
    void reset() override {
        frames_.clear();
        keypoints_.clear();
        descriptors_.clear();
        next_frame_id_ = 0;
    }
    
    void release() override {
        reset();
    }
};

ISfM* createSfM() {
    return new SfMStub();
}

void destroySfM(ISfM* sfm) {
    delete sfm;
}

} // namespace mobile_scan
