/**
 * @file camera_jni.cpp
 * @brief Android JNI Camera bridge implementation
 */

#include "camera_jni.h"
#include "../../include/mobile_scan/camera.h"
#include <android/log.h>

#define LOG_TAG "MobileScan"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace mobile_scan;

struct CameraContext {
    ICamera* camera;
    JavaVM* jvm;
    jobject callback_obj;
};

static void camera_frame_callback(const ImageFrame& frame, void* user_data) {
    CameraContext* ctx = static_cast<CameraContext*>(user_data);
    
    JNIEnv* env;
    bool attached = false;
    
    if (ctx->jvm->GetEnv((void**)&env, JNI_VERSION_1_6) == JNI_EDETACHED) {
        ctx->jvm->AttachCurrentThread(&env, nullptr);
        attached = true;
    }
    
    jclass callback_class = env->GetObjectClass(ctx->callback_obj);
    jmethodID on_frame = env->GetMethodID(callback_class, "onFrame", 
                                          "(Ljava/nio/ByteBuffer;IIIJ)V");
    
    jobject buffer = env->NewDirectByteBuffer(frame.data, 
                                              frame.height * frame.stride);
    
    env->CallVoidMethod(ctx->callback_obj, on_frame, buffer, 
                       frame.width, frame.height, frame.format, frame.timestamp_ns);
    
    env->DeleteLocalRef(buffer);
    env->DeleteLocalRef(callback_class);
    
    if (attached) {
        ctx->jvm->DetachCurrentThread();
    }
}

JNIEXPORT jlong JNICALL
Java_com_mobilescan_core_Camera_nativeCreate(JNIEnv *env, jobject thiz) {
    CameraContext* ctx = new CameraContext();
    ctx->camera = createCamera();
    env->GetJavaVM(&ctx->jvm);
    ctx->callback_obj = nullptr;
    return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT void JNICALL
Java_com_mobilescan_core_Camera_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle) {
    CameraContext* ctx = reinterpret_cast<CameraContext*>(handle);
    if (ctx) {
        if (ctx->callback_obj) {
            env->DeleteGlobalRef(ctx->callback_obj);
        }
        destroyCamera(ctx->camera);
        delete ctx;
    }
}

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_Camera_nativeInitialize(JNIEnv *env, jobject thiz, jlong handle,
                                                  jint width, jint height) {
    CameraContext* ctx = reinterpret_cast<CameraContext*>(handle);
    Status status = ctx->camera->initialize(width, height);
    return static_cast<jint>(status);
}

JNIEXPORT jint JNICALL
Java_com_mobilescan_core_Camera_nativeStart(JNIEnv *env, jobject thiz, jlong handle) {
    CameraContext* ctx = reinterpret_cast<CameraContext*>(handle);
    
    jclass thiz_class = env->GetObjectClass(thiz);
    jfieldID callback_field = env->GetFieldID(thiz_class, "frameCallback",
                                              "Lcom/mobilescan/core/Camera$FrameCallback;");
    jobject callback = env->GetObjectField(thiz, callback_field);
    
    if (ctx->callback_obj) {
        env->DeleteGlobalRef(ctx->callback_obj);
    }
    ctx->callback_obj = env->NewGlobalRef(callback);
    
    Status status = ctx->camera->start(camera_frame_callback, ctx);
    
    env->DeleteLocalRef(callback);
    env->DeleteLocalRef(thiz_class);
    
    return static_cast<jint>(status);
}

JNIEXPORT void JNICALL
Java_com_mobilescan_core_Camera_nativeStop(JNIEnv *env, jobject thiz, jlong handle) {
    CameraContext* ctx = reinterpret_cast<CameraContext*>(handle);
    ctx->camera->stop();
}

JNIEXPORT jobject JNICALL
Java_com_mobilescan_core_Camera_nativeGetIntrinsics(JNIEnv *env, jobject thiz, jlong handle) {
    CameraContext* ctx = reinterpret_cast<CameraContext*>(handle);
    
    CameraIntrinsics intrinsics;
    ctx->camera->getIntrinsics(intrinsics);
    
    jclass intrinsics_class = env->FindClass("com/mobilescan/core/CameraIntrinsics");
    jmethodID constructor = env->GetMethodID(intrinsics_class, "<init>", "(FFFFFFFFII)V");
    
    jobject result = env->NewObject(intrinsics_class, constructor,
                                    intrinsics.fx, intrinsics.fy,
                                    intrinsics.cx, intrinsics.cy,
                                    intrinsics.k1, intrinsics.k2, intrinsics.k3,
                                    intrinsics.p1, intrinsics.p2,
                                    intrinsics.width, intrinsics.height);
    
    env->DeleteLocalRef(intrinsics_class);
    return result;
}
