/**
 * @file MSCamera.mm
 * @brief iOS Camera bridge implementation
 */

#import "MSCamera.h"
#include "../../include/mobile_scan/camera.h"
#include <CoreVideo/CoreVideo.h>

@implementation MSCameraFrame
@end

@interface MSCamera () <AVCaptureVideoDataOutputSampleBufferDelegate>
@property (nonatomic, strong) AVCaptureSession *captureSession;
@property (nonatomic, strong) AVCaptureDevice *captureDevice;
@property (nonatomic, strong) AVCaptureVideoDataOutput *videoOutput;
@property (nonatomic, copy) MSCameraFrameCallback frameCallback;
@property (nonatomic, assign) mobile_scan::ICamera *cppCamera;
@end

@implementation MSCamera

- (BOOL)initializeWithWidth:(NSInteger)width height:(NSInteger)height error:(NSError **)error {
    self.captureSession = [[AVCaptureSession alloc] init];
    
    if (width >= 1920) {
        self.captureSession.sessionPreset = AVCaptureSessionPreset1920x1080;
    } else if (width >= 1280) {
        self.captureSession.sessionPreset = AVCaptureSessionPreset1280x720;
    } else {
        self.captureSession.sessionPreset = AVCaptureSessionPreset640x480;
    }
    
    self.captureDevice = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
    if (!self.captureDevice) {
        if (error) {
            *error = [NSError errorWithDomain:@"MSCamera" code:-1 
                                     userInfo:@{NSLocalizedDescriptionKey: @"No camera available"}];
        }
        return NO;
    }
    
    NSError *inputError = nil;
    AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:self.captureDevice 
                                                                        error:&inputError];
    if (inputError || ![self.captureSession canAddInput:input]) {
        if (error) *error = inputError;
        return NO;
    }
    
    [self.captureSession addInput:input];
    
    self.videoOutput = [[AVCaptureVideoDataOutput alloc] init];
    self.videoOutput.videoSettings = @{
        (id)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)
    };
    
    dispatch_queue_t queue = dispatch_queue_create("com.mobilescan.camera", DISPATCH_QUEUE_SERIAL);
    [self.videoOutput setSampleBufferDelegate:self queue:queue];
    
    if ([self.captureSession canAddOutput:self.videoOutput]) {
        [self.captureSession addOutput:self.videoOutput];
    }
    
    return YES;
}

- (BOOL)startWithCallback:(MSCameraFrameCallback)callback error:(NSError **)error {
    self.frameCallback = callback;
    [self.captureSession startRunning];
    return YES;
}

- (void)stop {
    [self.captureSession stopRunning];
}

- (NSDictionary *)getIntrinsics {
    CMVideoDimensions dimensions = CMVideoFormatDescriptionGetDimensions(
        self.captureDevice.activeFormat.formatDescription);
    
    float fx = dimensions.width * 1.2f;
    float fy = dimensions.height * 1.2f;
    float cx = dimensions.width / 2.0f;
    float cy = dimensions.height / 2.0f;
    
    return @{
        @"fx": @(fx), @"fy": @(fy),
        @"cx": @(cx), @"cy": @(cy),
        @"width": @(dimensions.width),
        @"height": @(dimensions.height)
    };
}

- (void)release {
    [self stop];
    self.captureSession = nil;
    self.captureDevice = nil;
    self.videoOutput = nil;
}

#pragma mark - AVCaptureVideoDataOutputSampleBufferDelegate

- (void)captureOutput:(AVCaptureOutput *)output 
didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer 
       fromConnection:(AVCaptureConnection *)connection {
    
    if (!self.frameCallback) return;
    
    CVImageBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
    CVPixelBufferLockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);
    
    void *baseAddress = CVPixelBufferGetBaseAddress(imageBuffer);
    size_t width = CVPixelBufferGetWidth(imageBuffer);
    size_t height = CVPixelBufferGetHeight(imageBuffer);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRow(imageBuffer);
    
    NSData *imageData = [NSData dataWithBytes:baseAddress 
                                       length:bytesPerRow * height];
    
    MSCameraFrame *frame = [[MSCameraFrame alloc] init];
    frame.imageData = imageData;
    frame.width = width;
    frame.height = height;
    frame.timestamp = (int64_t)(CACurrentMediaTime() * 1e9);
    
    CVPixelBufferUnlockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        self.frameCallback(frame);
    });
}

@end
