/**
 * @file MSCamera.h
 * @brief iOS Camera bridge interface
 */

#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * @brief Camera frame data for iOS
 */
@interface MSCameraFrame : NSObject
@property (nonatomic, strong) NSData *imageData;
@property (nonatomic, assign) NSInteger width;
@property (nonatomic, assign) NSInteger height;
@property (nonatomic, assign) int64_t timestamp;
@end

/**
 * @brief Camera frame callback block
 */
typedef void(^MSCameraFrameCallback)(MSCameraFrame *frame);

/**
 * @brief iOS Camera wrapper
 */
@interface MSCamera : NSObject

- (BOOL)initializeWithWidth:(NSInteger)width height:(NSInteger)height error:(NSError **)error;
- (BOOL)startWithCallback:(MSCameraFrameCallback)callback error:(NSError **)error;
- (void)stop;
- (NSDictionary *)getIntrinsics;
- (void)release;

@end

NS_ASSUME_NONNULL_END
