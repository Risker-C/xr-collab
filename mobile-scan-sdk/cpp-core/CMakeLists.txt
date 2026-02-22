cmake_minimum_required(VERSION 3.20)
project(MobileScanSDK VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Options
option(BUILD_TESTS "Build unit tests" ON)
option(BUILD_STUBS "Build stub implementations" ON)
option(BUILD_IOS "Build iOS platform support" OFF)
option(BUILD_ANDROID "Build Android platform support" OFF)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Source files (stubs for now)
set(SOURCES
    stubs/camera_stub.cpp
    stubs/lidar_stub.cpp
    stubs/sfm_stub.cpp
    stubs/pointcloud_stub.cpp
)

# Main library
add_library(mobile_scan_core STATIC ${SOURCES})
target_include_directories(mobile_scan_core PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# iOS platform support
if(BUILD_IOS)
    enable_language(OBJCXX)
    
    set(IOS_SOURCES
        platform/ios/MSCamera.mm
        platform/ios/MSLiDAR.mm
    )
    
    add_library(mobile_scan_ios STATIC ${IOS_SOURCES})
    target_link_libraries(mobile_scan_ios PRIVATE mobile_scan_core)
    target_link_libraries(mobile_scan_ios PUBLIC
        "-framework Foundation"
        "-framework AVFoundation"
        "-framework CoreVideo"
        "-framework ARKit"
    )
endif()

# Android platform support
if(BUILD_ANDROID)
    find_package(JNI REQUIRED)
    
    set(ANDROID_SOURCES
        platform/android/camera_jni.cpp
    )
    
    add_library(mobile_scan_android SHARED ${ANDROID_SOURCES})
    target_include_directories(mobile_scan_android PRIVATE ${JNI_INCLUDE_DIRS})
    target_link_libraries(mobile_scan_android PRIVATE mobile_scan_core)
    target_link_libraries(mobile_scan_android PRIVATE log android)
endif()

# Unit tests
if(BUILD_TESTS)
    enable_testing()
    
    # Download and configure Google Test
    include(FetchContent)
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG v1.14.0
    )
    
    # For Windows: Prevent overriding the parent project's compiler/linker settings
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)
    
    # Test executable
    add_executable(mobile_scan_tests
        tests/test_main.cpp
        tests/test_camera.cpp
        tests/test_lidar.cpp
        tests/test_sfm.cpp
        tests/test_pointcloud.cpp
    )
    
    target_link_libraries(mobile_scan_tests PRIVATE
        mobile_scan_core
        GTest::gtest
        GTest::gtest_main
    )
    
    # Add tests to CTest
    include(GoogleTest)
    gtest_discover_tests(mobile_scan_tests)
endif()

# Installation rules
install(TARGETS mobile_scan_core
    EXPORT MobileScanSDKTargets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/mobile_scan
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)

# Generate CMake config files
install(EXPORT MobileScanSDKTargets
    FILE MobileScanSDKTargets.cmake
    NAMESPACE MobileScanSDK::
    DESTINATION lib/cmake/MobileScanSDK
)

# Create config file
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/MobileScanSDKConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY AnyNewerVersion
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MobileScanSDKConfigVersion.cmake"
    DESTINATION lib/cmake/MobileScanSDK
)
