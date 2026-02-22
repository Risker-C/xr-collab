/**
 * @file pointcloud_jni.h
 * @brief Android JNI PointCloud bridge
 */

#ifndef MOBILE_SCAN_POINTCLOUD_JNI_H
#define MOBILE_SCAN_POINTCLOUD_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jlong JNICALL
Java_com_mobilescan_core_PointCloudProcessor_nativeCreate(JNIEnv *env, jobject thiz);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_PointCloudProcessor_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_PointCloudProcessor_nativeInitialize(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jobject JNICALL
Java_com_mobilescan_core_PointCloudProcessor_nativeDownsample(JNIEnv *env, jobject thiz, jlong handle,
                                                               jobject cloud, jfloat voxel_size);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_PointCloudProcessor_nativeExportPLY(JNIEnv *env, jobject thiz, jlong handle,
                                                              jobject cloud, jstring path);

#ifdef __cplusplus
}
#endif

#endif // MOBILE_SCAN_POINTCLOUD_JNI_H
