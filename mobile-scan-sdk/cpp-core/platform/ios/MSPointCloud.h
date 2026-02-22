/**
 * @file MSPointCloud.h
 * @brief iOS PointCloud processor bridge interface
 */

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface MSPointCloud : NSObject
@property (nonatomic, strong) NSData *pointData;
@property (nonatomic, assign) NSInteger pointCount;
@property (nonatomic, assign) int64_t timestamp;
@end

@interface MSPointCloudProcessor : NSObject

- (BOOL)initialize:(NSError **)error;
- (MSPointCloud *)mergeClouds:(NSArray<MSPointCloud *> *)clouds 
                        error:(NSError **)error;
- (MSPointCloud *)downsampleCloud:(MSPointCloud *)cloud 
                        voxelSize:(float)voxelSize
                            error:(NSError **)error;
- (MSPointCloud *)removeOutliersFromCloud:(MSPointCloud *)cloud 
                                neighbors:(NSInteger)neighbors
                                 stdRatio:(float)stdRatio
                                    error:(NSError **)error;
- (BOOL)exportCloud:(MSPointCloud *)cloud 
             toPath:(NSString *)path
              error:(NSError **)error;
- (void)release;

@end

NS_ASSUME_NONNULL_END
