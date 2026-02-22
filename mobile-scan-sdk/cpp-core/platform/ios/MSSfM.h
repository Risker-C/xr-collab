/**
 * @file MSSfM.h
 * @brief iOS SfM bridge interface
 */

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface MSKeypoint : NSObject
@property (nonatomic, assign) CGPoint position;
@property (nonatomic, assign) float response;
@property (nonatomic, assign) float scale;
@property (nonatomic, assign) float orientation;
@end

@interface MSSfM : NSObject

- (BOOL)initialize:(NSError **)error;
- (NSInteger)addFrameWithData:(NSData *)imageData 
                        width:(NSInteger)width 
                       height:(NSInteger)height
                   intrinsics:(NSDictionary *)intrinsics
                        error:(NSError **)error;
- (NSArray<MSKeypoint *> *)extractFeaturesFromFrame:(NSInteger)frameId 
                                              error:(NSError **)error;
- (NSArray<NSDictionary *> *)matchFeaturesFromFrame:(NSInteger)frameId1 
                                            toFrame:(NSInteger)frameId2
                                              error:(NSError **)error;
- (NSDictionary *)reconstructWithError:(NSError **)error;
- (void)reset;
- (void)release;

@end

NS_ASSUME_NONNULL_END
