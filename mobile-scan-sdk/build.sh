#!/bin/bash
set -e

# Mobile Scan SDK Build Script
# Usage: ./build.sh [flutter|cpp|all] [debug|release]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_TYPE="${2:-release}"
TARGET="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build Flutter
build_flutter() {
    log_info "Building Flutter UI..."
    cd "$SCRIPT_DIR/flutter-ui"
    
    # Get dependencies
    log_info "Getting Flutter dependencies..."
    flutter pub get
    
    # Run tests
    log_info "Running Flutter tests..."
    flutter test
    
    # Build Android
    if [ "$BUILD_TYPE" = "release" ]; then
        log_info "Building Android APK (release)..."
        flutter build apk --release
        
        log_info "Building Android App Bundle (release)..."
        flutter build appbundle --release
    else
        log_info "Building Android APK (debug)..."
        flutter build apk --debug
    fi
    
    # Build iOS (macOS only)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "Building iOS..."
        cd ios
        pod install
        cd ..
        
        if [ "$BUILD_TYPE" = "release" ]; then
            flutter build ios --release --no-codesign
        else
            flutter build ios --debug --no-codesign
        fi
    else
        log_warn "Skipping iOS build (macOS required)"
    fi
    
    log_info "Flutter build completed!"
}

# Build C++ Core
build_cpp() {
    log_info "Building C++ Core..."
    cd "$SCRIPT_DIR/cpp-core"
    
    # Create build directory
    mkdir -p build
    cd build
    
    # Configure CMake
    log_info "Configuring CMake..."
    if [ "$BUILD_TYPE" = "release" ]; then
        cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=ON -DBUILD_STUBS=ON
    else
        cmake .. -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTS=ON -DBUILD_STUBS=ON
    fi
    
    # Build
    log_info "Building C++ code..."
    cmake --build . --config $BUILD_TYPE -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    
    # Run tests
    log_info "Running C++ tests..."
    ctest --output-on-failure --verbose
    
    log_info "C++ build completed!"
}

# Build for Android NDK
build_cpp_android() {
    log_info "Building C++ for Android..."
    cd "$SCRIPT_DIR/cpp-core"
    
    if [ -z "$ANDROID_NDK_HOME" ]; then
        log_error "ANDROID_NDK_HOME not set. Please set it to your NDK path."
        exit 1
    fi
    
    mkdir -p build-android
    cd build-android
    
    log_info "Configuring CMake for Android..."
    cmake .. \
        -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
        -DANDROID_ABI=arm64-v8a \
        -DANDROID_PLATFORM=android-24 \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_TESTS=OFF \
        -DBUILD_ANDROID=ON
    
    log_info "Building for Android..."
    cmake --build . --config Release -j$(nproc 2>/dev/null || echo 4)
    
    log_info "Android C++ build completed!"
}

# Build for iOS
build_cpp_ios() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_warn "iOS build requires macOS. Skipping..."
        return
    fi
    
    log_info "Building C++ for iOS..."
    cd "$SCRIPT_DIR/cpp-core"
    
    mkdir -p build-ios
    cd build-ios
    
    log_info "Configuring CMake for iOS..."
    cmake .. \
        -G Xcode \
        -DCMAKE_SYSTEM_NAME=iOS \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_TESTS=OFF \
        -DBUILD_IOS=ON
    
    log_info "Building for iOS..."
    cmake --build . --config Release
    
    log_info "iOS C++ build completed!"
}

# Clean build artifacts
clean() {
    log_info "Cleaning build artifacts..."
    
    # Clean Flutter
    if [ -d "$SCRIPT_DIR/flutter-ui" ]; then
        cd "$SCRIPT_DIR/flutter-ui"
        flutter clean
    fi
    
    # Clean C++
    rm -rf "$SCRIPT_DIR/cpp-core/build"
    rm -rf "$SCRIPT_DIR/cpp-core/build-android"
    rm -rf "$SCRIPT_DIR/cpp-core/build-ios"
    
    log_info "Clean completed!"
}

# Main execution
main() {
    log_info "Mobile Scan SDK Build Script"
    log_info "Target: $TARGET | Build Type: $BUILD_TYPE"
    log_info "================================"
    
    case "$TARGET" in
        flutter)
            build_flutter
            ;;
        cpp)
            build_cpp
            ;;
        cpp-android)
            build_cpp_android
            ;;
        cpp-ios)
            build_cpp_ios
            ;;
        all)
            build_cpp
            build_flutter
            ;;
        clean)
            clean
            ;;
        *)
            log_error "Unknown target: $TARGET"
            echo "Usage: $0 [flutter|cpp|cpp-android|cpp-ios|all|clean] [debug|release]"
            exit 1
            ;;
    esac
    
    log_info "================================"
    log_info "Build completed successfully!"
}

# Run main
main
