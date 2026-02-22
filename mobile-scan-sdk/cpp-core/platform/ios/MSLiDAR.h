/**
 * @file MSLiDAR.h
 * @brief iOS LiDAR bridge interface
 */

#import <Foundation/Foundation.h>
#import <ARKit/ARKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface MSLiDARFrame : NSObject
@property (nonatomic, strong) NSData *pointData;
@property (nonatomic, assign) NSInteger pointCount;
@property (nonatomic, assign) int64_t timestamp;
@end

typedef void(^MSLiDARFrameCallback)(MSLiDARFrame *frame);

@interface MSLiDAR : NSObject

- (BOOL)initialize:(NSError **)error;
- (BOOL)startWithCallback:(MSLiDARFrameCallback)callback error:(NSError **)error;
- (void)stop;
- (BOOL)isAvailable;
- (void)release;

@end

NS_ASSUME_NONNULL_END
