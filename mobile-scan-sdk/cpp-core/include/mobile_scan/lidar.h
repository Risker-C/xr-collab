/**
 * @file lidar.h
 * @brief LiDAR data acquisition interface
 */

#ifndef MOBILE_SCAN_LIDAR_H
#define MOBILE_SCAN_LIDAR_H

#include "types.h"

namespace mobile_scan {

/**
 * @brief LiDAR frame callback
 */
using LiDARFrameCallback = void(*)(const LiDARFrame& frame, void* user_data);

/**
 * @brief LiDAR capture interface
 */
class ILiDAR {
public:
    virtual ~ILiDAR() = default;
    
    /**
     * @brief Initialize LiDAR sensor
     */
    virtual Status initialize() = 0;
    
    /**
     * @brief Start LiDAR capture
     */
    virtual Status start(LiDARFrameCallback callback, void* user_data) = 0;
    
    /**
     * @brief Stop LiDAR capture
     */
    virtual Status stop() = 0;
    
    /**
     * @brief Check if LiDAR is available on device
     */
    virtual bool isAvailable() = 0;
    
    /**
     * @brief Release resources
     */
    virtual void release() = 0;
};

/**
 * @brief Create LiDAR instance
 */
ILiDAR* createLiDAR();

/**
 * @brief Destroy LiDAR instance
 */
void destroyLiDAR(ILiDAR* lidar);

} // namespace mobile_scan

#endif // MOBILE_SCAN_LIDAR_H
