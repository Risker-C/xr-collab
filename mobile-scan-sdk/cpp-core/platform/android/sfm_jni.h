/**
 * @file sfm_jni.h
 * @brief Android JNI SfM bridge
 */

#ifndef MOBILE_SCAN_SFM_JNI_H
#define MOBILE_SCAN_SFM_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jlong JNICALL
Java_com_mobilescan_core_SfM_nativeCreate(JNIEnv *env, jobject thiz);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_SfM_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_SfM_nativeInitialize(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_SfM_nativeAddFrame(JNIEnv *env, jobject thiz, jlong handle,
                                            jobject image_buffer, jint width, jint height,
                                            jobject intrinsics);

JNIEXPORT jobject JNICALL
Java_com_mobilescan_core_SfM_nativeExtractFeatures(JNIEnv *env, jobject thiz, jlong handle,
                                                    jint frame_id);

JNIEXPORT jobject JNICALL
Java_com_mobilescan_core_SfM_nativeReconstruct(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_SfM_nativeReset(JNIEnv *env, jobject thiz, jlong handle);

#ifdef __cplusplus
}
#endif

#endif // MOBILE_SCAN_SFM_JNI_H
