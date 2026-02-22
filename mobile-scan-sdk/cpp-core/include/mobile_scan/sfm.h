/**
 * @file sfm.h
 * @brief Structure from Motion (SfM) interface
 */

#ifndef MOBILE_SCAN_SFM_H
#define MOBILE_SCAN_SFM_H

#include "types.h"
#include <vector>

namespace mobile_scan {

/**
 * @brief SfM reconstruction result
 */
struct SfMResult {
    std::vector<Pose> camera_poses;
    PointCloud reconstructed_points;
    float reprojection_error;
    
    SfMResult() : reprojection_error(0) {}
};

/**
 * @brief Structure from Motion processor
 */
class ISfM {
public:
    virtual ~ISfM() = default;
    
    /**
     * @brief Initialize SfM processor
     */
    virtual Status initialize() = 0;
    
    /**
     * @brief Add image frame for reconstruction
     * @param frame Input image frame
     * @param intrinsics Camera intrinsics
     * @return Frame ID for tracking
     */
    virtual Status addFrame(const ImageFrame& frame, 
                           const CameraIntrinsics& intrinsics,
                           int32_t& frame_id) = 0;
    
    /**
     * @brief Extract features from frame
     */
    virtual Status extractFeatures(int32_t frame_id,
                                   std::vector<Keypoint>& keypoints,
                                   std::vector<Descriptor>& descriptors) = 0;
    
    /**
     * @brief Match features between two frames
     */
    virtual Status matchFeatures(int32_t frame_id_1, 
                                int32_t frame_id_2,
                                std::vector<FeatureMatch>& matches) = 0;
    
    /**
     * @brief Estimate pose between two frames
     */
    virtual Status estimatePose(int32_t frame_id_1,
                               int32_t frame_id_2,
                               const std::vector<FeatureMatch>& matches,
                               Pose& relative_pose) = 0;
    
    /**
     * @brief Run full reconstruction
     */
    virtual Status reconstruct(SfMResult& result) = 0;
    
    /**
     * @brief Reset reconstruction state
     */
    virtual void reset() = 0;
    
    /**
     * @brief Release resources
     */
    virtual void release() = 0;
};

/**
 * @brief Create SfM processor instance
 */
ISfM* createSfM();

/**
 * @brief Destroy SfM processor instance
 */
void destroySfM(ISfM* sfm);

} // namespace mobile_scan

#endif // MOBILE_SCAN_SFM_H
