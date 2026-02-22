/**
 * @file lidar_jni.h
 * @brief Android JNI LiDAR bridge
 */

#ifndef MOBILE_SCAN_LIDAR_JNI_H
#define MOBILE_SCAN_LIDAR_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jlong JNICALL
Java_com_mobilescan_core_LiDAR_nativeCreate(JNIEnv *env, jobject thiz);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_LiDAR_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_LiDAR_nativeInitialize(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_LiDAR_nativeStart(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_LiDAR_nativeStop(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jboolean JNICALL
Java_com_mobilescan_core_LiDAR_nativeIsAvailable(JNIEnv *env, jobject thiz, jlong handle);

#ifdef __cplusplus
}
#endif

#endif // MOBILE_SCAN_LIDAR_JNI_H
