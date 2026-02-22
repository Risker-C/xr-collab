/**
 * @file MSLiDAR.mm
 * @brief iOS LiDAR bridge implementation
 */

#import "MSLiDAR.h"

@implementation MSLiDARFrame
@end

@interface MSLiDAR () <ARSessionDelegate>
@property (nonatomic, strong) ARSession *arSession;
@property (nonatomic, copy) MSLiDARFrameCallback frameCallback;
@end

@implementation MSLiDAR

- (BOOL)initialize:(NSError **)error {
    if (![ARWorldTrackingConfiguration supportsSceneReconstruction:ARSceneReconstructionMesh]) {
        if (error) {
            *error = [NSError errorWithDomain:@"MSLiDAR" code:-1 
                                     userInfo:@{NSLocalizedDescriptionKey: @"LiDAR not available"}];
        }
        return NO;
    }
    
    self.arSession = [[ARSession alloc] init];
    self.arSession.delegate = self;
    return YES;
}

- (BOOL)startWithCallback:(MSLiDARFrameCallback)callback error:(NSError **)error {
    self.frameCallback = callback;
    
    ARWorldTrackingConfiguration *config = [[ARWorldTrackingConfiguration alloc] init];
    config.sceneReconstruction = ARSceneReconstructionMesh;
    config.frameSemantics = ARFrameSemanticSceneDepth;
    
    [self.arSession runWithConfiguration:config];
    return YES;
}

- (void)stop {
    [self.arSession pause];
}

- (BOOL)isAvailable {
    return [ARWorldTrackingConfiguration supportsSceneReconstruction:ARSceneReconstructionMesh];
}

- (void)release {
    [self stop];
    self.arSession = nil;
}

#pragma mark - ARSessionDelegate

- (void)session:(ARSession *)session didUpdateFrame:(ARFrame *)frame {
    if (!self.frameCallback || !frame.sceneDepth) return;
    
    ARDepthData *depthData = frame.sceneDepth.depthMap;
    CVPixelBufferRef depthBuffer = depthData.depthMap;
    
    CVPixelBufferLockBaseAddress(depthBuffer, kCVPixelBufferLock_ReadOnly);
    
    size_t width = CVPixelBufferGetWidth(depthBuffer);
    size_t height = CVPixelBufferGetHeight(depthBuffer);
    Float32 *depthValues = (Float32 *)CVPixelBufferGetBaseAddress(depthBuffer);
    
    NSMutableData *pointData = [NSMutableData dataWithCapacity:width * height * sizeof(float) * 3];
    float *points = (float *)pointData.mutableBytes;
    NSInteger pointCount = 0;
    
    for (size_t y = 0; y < height; y++) {
        for (size_t x = 0; x < width; x++) {
            float depth = depthValues[y * width + x];
            if (depth > 0 && depth < 10.0f) {
                points[pointCount * 3 + 0] = (x - width/2.0f) * depth / 1000.0f;
                points[pointCount * 3 + 1] = (y - height/2.0f) * depth / 1000.0f;
                points[pointCount * 3 + 2] = depth;
                pointCount++;
            }
        }
    }
    
    CVPixelBufferUnlockBaseAddress(depthBuffer, kCVPixelBufferLock_ReadOnly);
    
    MSLiDARFrame *lidarFrame = [[MSLiDARFrame alloc] init];
    lidarFrame.pointData = pointData;
    lidarFrame.pointCount = pointCount;
    lidarFrame.timestamp = (int64_t)(frame.timestamp * 1e9);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        self.frameCallback(lidarFrame);
    });
}

@end
