/**
 * @file types.h
 * @brief Core type definitions for Mobile Scan SDK
 * @version 1.0.0
 * @date 2026-02-22
 */

#ifndef MOBILE_SCAN_TYPES_H
#define MOBILE_SCAN_TYPES_H

#include <cstdint>
#include <string>
#include <vector>
#include <memory>

namespace mobile_scan {

/**
 * @brief Result status codes
 */
enum class Status {
    OK = 0,
    ERROR_INVALID_PARAMETER = -1,
    ERROR_NOT_INITIALIZED = -2,
    ERROR_ALREADY_INITIALIZED = -3,
    ERROR_NOT_SUPPORTED = -4,
    ERROR_PERMISSION_DENIED = -5,
    ERROR_DEVICE_NOT_AVAILABLE = -6,
    ERROR_OUT_OF_MEMORY = -7,
    ERROR_INTERNAL = -100
};

/**
 * @brief 3D Point representation
 */
struct Point3D {
    float x;  ///< X coordinate in meters
    float y;  ///< Y coordinate in meters
    float z;  ///< Z coordinate in meters
    
    Point3D() : x(0), y(0), z(0) {}
    Point3D(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}
};

/**
 * @brief RGB Color representation
 */
struct Color {
    uint8_t r;  ///< Red channel [0-255]
    uint8_t g;  ///< Green channel [0-255]
    uint8_t b;  ///< Blue channel [0-255]
    
    Color() : r(0), g(0), b(0) {}
    Color(uint8_t r_, uint8_t g_, uint8_t b_) : r(r_), g(g_), b(b_) {}
};

/**
 * @brief Colored 3D Point
 */
struct ColoredPoint3D {
    Point3D position;
    Color color;
    float confidence;  ///< Confidence score [0.0-1.0]
    
    ColoredPoint3D() : confidence(1.0f) {}
};

/**
 * @brief 2D Point in image space
 */
struct Point2D {
    float x;  ///< X coordinate in pixels
    float y;  ///< Y coordinate in pixels
    
    Point2D() : x(0), y(0) {}
    Point2D(float x_, float y_) : x(x_), y(y_) {}
};

/**
 * @brief 3x3 Matrix representation
 */
struct Matrix3x3 {
    float data[9];  ///< Row-major order
    
    Matrix3x3() {
        for (int i = 0; i < 9; ++i) data[i] = 0.0f;
    }
};

/**
 * @brief 4x4 Matrix representation for transforms
 */
struct Matrix4x4 {
    float data[16];  ///< Row-major order
    
    Matrix4x4() {
        for (int i = 0; i < 16; ++i) data[i] = 0.0f;
    }
};

/**
 * @brief Quaternion representation
 */
struct Quaternion {
    float x, y, z, w;
    
    Quaternion() : x(0), y(0), z(0), w(1) {}
    Quaternion(float x_, float y_, float z_, float w_) 
        : x(x_), y(y_), z(z_), w(w_) {}
};

/**
 * @brief 6DOF Pose representation
 */
struct Pose {
    Point3D position;
    Quaternion orientation;
    int64_t timestamp_ns;  ///< Timestamp in nanoseconds
    
    Pose() : timestamp_ns(0) {}
};

/**
 * @brief Image frame data
 */
struct ImageFrame {
    uint8_t* data;          ///< Raw pixel data (not owned)
    int32_t width;          ///< Image width in pixels
    int32_t height;         ///< Image height in pixels
    int32_t stride;         ///< Row stride in bytes
    int32_t format;         ///< Pixel format (0=RGBA, 1=RGB, 2=GRAY, 3=YUV)
    int64_t timestamp_ns;   ///< Capture timestamp in nanoseconds
    
    ImageFrame() 
        : data(nullptr), width(0), height(0), stride(0), 
          format(0), timestamp_ns(0) {}
};

/**
 * @brief Camera intrinsic parameters
 */
struct CameraIntrinsics {
    float fx;              ///< Focal length X
    float fy;              ///< Focal length Y
    float cx;              ///< Principal point X
    float cy;              ///< Principal point Y
    float k1, k2, k3;      ///< Radial distortion coefficients
    float p1, p2;          ///< Tangential distortion coefficients
    int32_t width;         ///< Image width
    int32_t height;        ///< Image height
    
    CameraIntrinsics() 
        : fx(0), fy(0), cx(0), cy(0), 
          k1(0), k2(0), k3(0), p1(0), p2(0),
          width(0), height(0) {}
};

/**
 * @brief LiDAR point cloud data
 */
struct LiDARFrame {
    Point3D* points;        ///< Point array (not owned)
    float* intensities;     ///< Intensity values (not owned, nullable)
    int32_t point_count;    ///< Number of points
    int64_t timestamp_ns;   ///< Capture timestamp
    
    LiDARFrame() 
        : points(nullptr), intensities(nullptr), 
          point_count(0), timestamp_ns(0) {}
};

/**
 * @brief Point cloud data with colors
 */
struct PointCloud {
    std::vector<ColoredPoint3D> points;
    int64_t timestamp_ns;
    
    PointCloud() : timestamp_ns(0) {}
};

/**
 * @brief Feature keypoint in 2D image
 */
struct Keypoint {
    Point2D position;
    float response;        ///< Feature response strength
    float scale;           ///< Scale/octave
    float orientation;     ///< Orientation in radians
    
    Keypoint() : response(0), scale(1.0f), orientation(0) {}
};

/**
 * @brief Feature descriptor (128-dim float vector for SIFT-like)
 */
struct Descriptor {
    static constexpr int32_t DESCRIPTOR_SIZE = 128;
    float data[DESCRIPTOR_SIZE];
    
    Descriptor() {
        for (int i = 0; i < DESCRIPTOR_SIZE; ++i) data[i] = 0.0f;
    }
};

/**
 * @brief Feature match between two frames
 */
struct FeatureMatch {
    int32_t keypoint_index_1;
    int32_t keypoint_index_2;
    float distance;
    
    FeatureMatch() : keypoint_index_1(-1), keypoint_index_2(-1), distance(0) {}
};

} // namespace mobile_scan

#endif // MOBILE_SCAN_TYPES_H
