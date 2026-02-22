/**
 * @file pointcloud.h
 * @brief Point cloud processing interface
 */

#ifndef MOBILE_SCAN_POINTCLOUD_H
#define MOBILE_SCAN_POINTCLOUD_H

#include "types.h"

namespace mobile_scan {

/**
 * @brief Point cloud processor
 */
class IPointCloudProcessor {
public:
    virtual ~IPointCloudProcessor() = default;
    
    /**
     * @brief Initialize processor
     */
    virtual Status initialize() = 0;
    
    /**
     * @brief Merge multiple point clouds
     */
    virtual Status merge(const PointCloud* clouds, int32_t count, 
                        PointCloud& output) = 0;
    
    /**
     * @brief Downsample point cloud using voxel grid
     */
    virtual Status downsample(const PointCloud& input, float voxel_size,
                             PointCloud& output) = 0;
    
    /**
     * @brief Remove statistical outliers
     */
    virtual Status removeOutliers(const PointCloud& input, int32_t neighbors,
                                  float std_ratio, PointCloud& output) = 0;
    
    /**
     * @brief Transform point cloud by pose
     */
    virtual Status transform(const PointCloud& input, const Pose& pose,
                            PointCloud& output) = 0;
    
    /**
     * @brief Export to PLY format
     */
    virtual Status exportPLY(const PointCloud& cloud, const char* path) = 0;
    
    /**
     * @brief Release resources
     */
    virtual void release() = 0;
};

/**
 * @brief Create point cloud processor instance
 */
IPointCloudProcessor* createPointCloudProcessor();

/**
 * @brief Destroy point cloud processor instance
 */
void destroyPointCloudProcessor(IPointCloudProcessor* processor);

} // namespace mobile_scan

#endif // MOBILE_SCAN_POINTCLOUD_H
