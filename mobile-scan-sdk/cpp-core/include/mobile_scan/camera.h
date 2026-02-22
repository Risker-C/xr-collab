/**
 * @file camera.h
 * @brief Camera capture interface
 */

#ifndef MOBILE_SCAN_CAMERA_H
#define MOBILE_SCAN_CAMERA_H

#include "types.h"

namespace mobile_scan {

/**
 * @brief Camera frame callback
 */
using CameraFrameCallback = void(*)(const ImageFrame& frame, void* user_data);

/**
 * @brief Camera capture interface
 */
class ICamera {
public:
    virtual ~ICamera() = default;
    
    /**
     * @brief Initialize camera with resolution
     */
    virtual Status initialize(int32_t width, int32_t height) = 0;
    
    /**
     * @brief Start camera capture
     */
    virtual Status start(CameraFrameCallback callback, void* user_data) = 0;
    
    /**
     * @brief Stop camera capture
     */
    virtual Status stop() = 0;
    
    /**
     * @brief Get camera intrinsics
     */
    virtual Status getIntrinsics(CameraIntrinsics& intrinsics) = 0;
    
    /**
     * @brief Release resources
     */
    virtual void release() = 0;
};

/**
 * @brief Create camera instance
 */
ICamera* createCamera();

/**
 * @brief Destroy camera instance
 */
void destroyCamera(ICamera* camera);

} // namespace mobile_scan

#endif // MOBILE_SCAN_CAMERA_H
