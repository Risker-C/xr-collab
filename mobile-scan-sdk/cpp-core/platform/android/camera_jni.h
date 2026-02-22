/**
 * @file camera_jni.h
 * @brief Android JNI Camera bridge
 */

#ifndef MOBILE_SCAN_CAMERA_JNI_H
#define MOBILE_SCAN_CAMERA_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jlong JNICALL
Java_com_mobilescan_core_Camera_nativeCreate(JNIEnv *env, jobject thiz);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_Camera_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_Camera_nativeInitialize(JNIEnv *env, jobject thiz, jlong handle, 
                                                  jint width, jint height);

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_Camera_nativeStart(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT void JNICALL
Java_com_mobilescan_core_Camera_nativeStop(JNIEnv *env, jobject thiz, jlong handle);

JNIEXPORT jobject JNICALL
Java_com_mobilescan_core_Camera_nativeGetIntrinsics(JNIEnv *env, jobject thiz, jlong handle);

#ifdef __cplusplus
}
#endif

#endif // MOBILE_SCAN_CAMERA_JNI_H
