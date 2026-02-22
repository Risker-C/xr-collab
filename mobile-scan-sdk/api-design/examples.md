# API Examples - Request & Response

## 1. Device Capability Detection

### Request: iPhone 15 Pro (High-tier Device)

```bash
POST /api/device/capability
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "deviceId": "device-uuid-12345",
  "platform": "iOS",
  "osVersion": "17.2",
  "deviceModel": "iPhone15,3",
  "cpuCores": 6,
  "cpuFrequency": 3460,
  "gpuModel": "Apple A17 Pro GPU",
  "ramMB": 8192,
  "screenWidth": 1179,
  "screenHeight": 2556,
  "screenDensity": 460,
  "supportedFeatures": [
    "ARKit",
    "LiDAR",
    "Metal3"
  ],
  "batteryLevel": 85,
  "thermalState": "nominal"
}
```

### Response: High-tier Classification

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "deviceId": "device-uuid-12345",
  "tier": "High",
  "score": 92,
  "capabilities": {
    "maxModelComplexity": 500000,
    "maxTextureSize": 4096,
    "recommendedLOD": 2,
    "supportedFormats": [
      "glTF",
      "USDZ"
    ],
    "maxConcurrentModels": 8,
    "realtimeCollaboration": true,
    "advancedShaders": true
  },
  "recommendations": {
    "enableHDR": true,
    "enableShadows": true,
    "enablePostProcessing": true,
    "targetFPS": 60
  },
  "profileId": "profile-abc123",
  "createdAt": "2026-02-22T12:20:00Z"
}
```

---

### Request: Samsung Galaxy A53 (Medium-tier Device)

```bash
POST /api/device/capability
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "deviceId": "device-uuid-67890",
  "platform": "Android",
  "osVersion": "14",
  "deviceModel": "SM-A536B",
  "cpuCores": 8,
  "cpuFrequency": 2400,
  "gpuModel": "Mali-G68",
  "ramMB": 6144,
  "screenWidth": 1080,
  "screenHeight": 2400,
  "screenDensity": 405,
  "supportedFeatures": [
    "ARCore",
    "Vulkan"
  ],
  "batteryLevel": 45,
  "thermalState": "fair"
}
```

### Response: Medium-tier Classification

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "deviceId": "device-uuid-67890",
  "tier": "Medium",
  "score": 68,
  "capabilities": {
    "maxModelComplexity": 200000,
    "maxTextureSize": 2048,
    "recommendedLOD": 1,
    "supportedFormats": [
      "glTF"
    ],
    "maxConcurrentModels": 4,
    "realtimeCollaboration": true,
    "advancedShaders": false
  },
  "recommendations": {
    "enableHDR": false,
    "enableShadows": false,
    "enablePostProcessing": false,
    "targetFPS": 30
  },
  "profileId": "profile-def456",
  "createdAt": "2026-02-22T12:20:00Z"
}
```

---

### Request: Budget Android Phone (Low-tier Device)

```bash
POST /api/device/capability
Content-Type: application/json

{
  "deviceId": "device-uuid-99999",
  "platform": "Android",
  "osVersion": "13",
  "deviceModel": "Redmi 10C",
  "cpuCores": 8,
  "cpuFrequency": 1800,
  "gpuModel": "Mali-G52",
  "ramMB": 3072,
  "screenWidth": 720,
  "screenHeight": 1650,
  "screenDensity": 269,
  "supportedFeatures": [
    "OpenGL ES 3.2"
  ],
  "batteryLevel": 30,
  "thermalState": "serious"
}
```

### Response: Low-tier Classification

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "deviceId": "device-uuid-99999",
  "tier": "Low",
  "score": 38,
  "capabilities": {
    "maxModelComplexity": 50000,
    "maxTextureSize": 1024,
    "recommendedLOD": 0,
    "supportedFormats": [
      "glTF"
    ],
    "maxConcurrentModels": 2,
    "realtimeCollaboration": false,
    "advancedShaders": false
  },
  "recommendations": {
    "enableHDR": false,
    "enableShadows": false,
    "enablePostProcessing": false,
    "targetFPS": 24
  },
  "profileId": "profile-ghi789",
  "createdAt": "2026-02-22T12:20:00Z"
}
```

---

## 2. Multi-LOD Model Retrieval

### Request: Get LOD Level 2 (High Quality)

```bash
GET /api/model/model-xyz789/lod/2?format=glTF
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

### Response: Model Metadata with Download URL

```json
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "8f4b2e1a9c6d3f7e5a2b8c1d4e6f9a3b"
Cache-Control: public, max-age=86400
Content-Length: 2457600

{
  "modelId": "model-xyz789",
  "lodLevel": 2,
  "format": "glTF",
  "downloadUrl": "https://cdn.xrcollab.com/models/model-xyz789/lod2.gltf?expires=1708704000&signature=abc123...",
  "metadata": {
    "vertices": 120000,
    "triangles": 200000,
    "textureSize": 4096,
    "fileSizeBytes": 8945600,
    "boundingBox": {
      "min": [-2.5, 0, -2.5],
      "max": [2.5, 3.0, 2.5]
    },
    "materials": 5,
    "animations": 2
  },
  "expiresAt": "2026-02-23T12:20:00Z",
  "etag": "8f4b2e1a9c6d3f7e5a2b8c1d4e6f9a3b"
}
```

---

### Request: Get LOD Level 0 (Low Quality for Low-tier Devices)

```bash
GET /api/model/model-xyz789/lod/0?format=glTF
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: Simplified Model

```json
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
Cache-Control: public, max-age=86400

{
  "modelId": "model-xyz789",
  "lodLevel": 0,
  "format": "glTF",
  "downloadUrl": "https://cdn.xrcollab.com/models/model-xyz789/lod0.gltf?expires=1708704000&signature=xyz789...",
  "metadata": {
    "vertices": 8000,
    "triangles": 12000,
    "textureSize": 512,
    "fileSizeBytes": 324600,
    "boundingBox": {
      "min": [-2.5, 0, -2.5],
      "max": [2.5, 3.0, 2.5]
    },
    "materials": 2,
    "animations": 0
  },
  "expiresAt": "2026-02-23T12:20:00Z",
  "etag": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
}
```

---

### Request: USDZ Format for iOS

```bash
GET /api/model/model-xyz789/lod/2?format=USDZ
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: USDZ Model

```json
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "7f8e9d0c1b2a3f4e5d6c7b8a9e0f1d2c"
Cache-Control: public, max-age=86400

{
  "modelId": "model-xyz789",
  "lodLevel": 2,
  "format": "USDZ",
  "downloadUrl": "https://cdn.xrcollab.com/models/model-xyz789/lod2.usdz?expires=1708704000&signature=usdz123...",
  "metadata": {
    "vertices": 120000,
    "triangles": 200000,
    "textureSize": 4096,
    "fileSizeBytes": 9245800,
    "boundingBox": {
      "min": [-2.5, 0, -2.5],
      "max": [2.5, 3.0, 2.5]
    },
    "materials": 5,
    "animations": 2
  },
  "expiresAt": "2026-02-23T12:20:00Z",
  "etag": "7f8e9d0c1b2a3f4e5d6c7b8a9e0f1d2c"
}
```

---

### Response: 304 Not Modified (Cached)

```bash
GET /api/model/model-xyz789/lod/2?format=glTF
If-None-Match: "8f4b2e1a9c6d3f7e5a2b8c1d4e6f9a3b"
```

```
HTTP/1.1 304 Not Modified
ETag: "8f4b2e1a9c6d3f7e5a2b8c1d4e6f9a3b"
Cache-Control: public, max-age=86400
```

---

## 3. Chunked Upload Flow

### Step 1: Initialize Upload Session

```bash
POST /api/capture/upload/init
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "fileName": "room_scan_20260222.zip",
  "fileSize": 157286400,
  "mimeType": "application/zip",
  "chunkSize": 5242880,
  "metadata": {
    "captureType": "room_scan",
    "deviceId": "device-uuid-12345",
    "timestamp": "2026-02-22T12:20:00Z",
    "location": "Living Room",
    "scanDuration": 180
  }
}
```

### Response: Session Created

```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "uploadId": "upload-abc123def456",
  "chunkSize": 5242880,
  "totalChunks": 30,
  "expiresAt": "2026-02-23T12:20:00Z"
}
```

---

### Step 2: Upload Chunk #0

```bash
POST /api/capture/upload/chunk
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="uploadId"

upload-abc123def456
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="chunkIndex"

0
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="checksum"

5d41402abc4b2a76b9719d911017c592
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="chunk"; filename="chunk_0"
Content-Type: application/octet-stream

[Binary chunk data - 5242880 bytes]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### Response: Chunk Received

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "uploadId": "upload-abc123def456",
  "chunkIndex": 0,
  "received": true,
  "uploadedChunks": 1,
  "totalChunks": 30,
  "percentComplete": 3
}
```

---

### Step 3: Upload Chunks #1-29 (Similar to Step 2)

```bash
POST /api/capture/upload/chunk
# ... (repeat for each chunk with incrementing chunkIndex)
```

---

### Step 4: Check Upload Status

```bash
GET /api/capture/upload/status/upload-abc123def456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response: Upload Progress

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "uploadId": "upload-abc123def456",
  "status": "uploading",
  "uploadedChunks": 18,
  "totalChunks": 30,
  "percentComplete": 60,
  "uploadedBytes": 94371840,
  "totalBytes": 157286400,
  "createdAt": "2026-02-22T12:20:00Z",
  "expiresAt": "2026-02-23T12:20:00Z"
}
```

---

### Step 5: Complete Upload

```bash
POST /api/capture/upload/complete
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "uploadId": "upload-abc123def456",
  "finalChecksum": "098f6bcd4621d373cade4e832627b4f6"
}
```

### Response: Upload Completed

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "uploadId": "upload-abc123def456",
  "captureId": "capture-789xyz",
  "status": "processing",
  "resourceUrl": "https://api.xrcollab.com/v1/captures/capture-789xyz",
  "estimatedProcessingTime": 120
}
```

---

## 4. Error Responses

### 400 Bad Request - Missing Required Field

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "INVALID_REQUEST",
  "message": "Missing required field: deviceId",
  "details": {
    "field": "deviceId",
    "expected": "string (UUID format)"
  }
}
```

---

### 404 Not Found - Model Not Found

```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "NOT_FOUND",
  "message": "Model with ID 'model-invalid' not found"
}
```

---

### 409 Conflict - Chunk Already Uploaded

```json
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": "CHUNK_ALREADY_UPLOADED",
  "message": "Chunk 5 has already been uploaded",
  "chunkIndex": 5
}
```

---

### 413 Payload Too Large

```json
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "error": "FILE_TOO_LARGE",
  "message": "File size exceeds maximum of 500MB",
  "maxSizeBytes": 524288000,
  "providedBytes": 629145600
}
```

---

### 422 Unprocessable Entity - Upload Incomplete

```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": "UPLOAD_INCOMPLETE",
  "message": "Missing chunks: 5, 12, 28",
  "missingChunks": [5, 12, 28],
  "uploadedChunks": 27,
  "totalChunks": 30
}
```

---

### 429 Rate Limit Exceeded

```json
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "limit": 100,
  "window": "1 minute"
}
```

---

### 500 Internal Server Error

```json
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req-abc123-xyz789"
}
```

---

## 5. cURL Examples

### Device Capability Detection

```bash
curl -X POST https://api.xrcollab.com/v1/api/device/capability \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceId": "device-uuid-12345",
    "platform": "iOS",
    "osVersion": "17.2",
    "deviceModel": "iPhone15,3",
    "cpuCores": 6,
    "cpuFrequency": 3460,
    "gpuModel": "Apple A17 Pro GPU",
    "ramMB": 8192,
    "screenWidth": 1179,
    "screenHeight": 2556,
    "screenDensity": 460,
    "supportedFeatures": ["ARKit", "LiDAR", "Metal3"],
    "batteryLevel": 85,
    "thermalState": "nominal"
  }'
```

---

### Get Model LOD

```bash
curl -X GET "https://api.xrcollab.com/v1/api/model/model-xyz789/lod/2?format=glTF" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "If-None-Match: \"33a64df551425fcc55e4d42a148795d9f25f89d4\""
```

---

### Initialize Upload

```bash
curl -X POST https://api.xrcollab.com/v1/api/capture/upload/init \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fileName": "room_scan_20260222.zip",
    "fileSize": 157286400,
    "mimeType": "application/zip",
    "chunkSize": 5242880,
    "metadata": {
      "captureType": "room_scan",
      "deviceId": "device-uuid-12345",
      "timestamp": "2026-02-22T12:20:00Z"
    }
  }'
```

---

### Upload Chunk

```bash
curl -X POST https://api.xrcollab.com/v1/api/capture/upload/chunk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "uploadId=upload-abc123def456" \
  -F "chunkIndex=0" \
  -F "checksum=5d41402abc4b2a76b9719d911017c592" \
  -F "chunk=@chunk_0.bin"
```

---

### Complete Upload

```bash
curl -X POST https://api.xrcollab.com/v1/api/capture/upload/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "uploadId": "upload-abc123def456",
    "finalChecksum": "098f6bcd4621d373cade4e832627b4f6"
  }'
```

---

## 6. Client SDK Integration Examples

### JavaScript/TypeScript (React Native)

```typescript
// Device capability detection
async function detectDeviceCapability() {
  const deviceInfo = {
    deviceId: await getDeviceId(),
    platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
    osVersion: Platform.Version.toString(),
    deviceModel: await DeviceInfo.getModel(),
    cpuCores: await DeviceInfo.getProcessorCount(),
    cpuFrequency: await DeviceInfo.getMaxCpuFreqMHz(),
    gpuModel: await DeviceInfo.getGpuName(),
    ramMB: Math.floor((await DeviceInfo.getTotalMemory()) / 1024 / 1024),
    screenWidth: Dimensions.get('window').width * PixelRatio.get(),
    screenHeight: Dimensions.get('window').height * PixelRatio.get(),
    screenDensity: PixelRatio.get() * 160,
    supportedFeatures: await getARFeatures(),
    batteryLevel: Math.floor((await DeviceInfo.getBatteryLevel()) * 100),
    thermalState: await DeviceInfo.getThermalState()
  };

  const response = await fetch('https://api.xrcollab.com/v1/api/device/capability', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(deviceInfo)
  });

  const capability = await response.json();
  console.log('Device tier:', capability.tier);
  console.log('Recommended LOD:', capability.capabilities.recommendedLOD);
  
  return capability;
}

// Load model with appropriate LOD
async function loadModel(modelId: string, lodLevel: number) {
  const response = await fetch(
    `https://api.xrcollab.com/v1/api/model/${modelId}/lod/${lodLevel}?format=glTF`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'If-None-Match': cachedEtag || ''
      }
    }
  );

  if (response.status === 304) {
    console.log('Using cached model');
    return loadFromCache(modelId, lodLevel);
  }

  const modelData = await response.json();
  const etag = response.headers.get('ETag');
  
  // Download model file
  const modelBlob = await fetch(modelData.downloadUrl);
  
  // Cache for future use
  await cacheModel(modelId, lodLevel, modelBlob, etag);
  
  return modelBlob;
}

// Chunked upload
async function uploadCapture(filePath: string) {
  const fileInfo = await RNFS.stat(filePath);
  const chunkSize = 5 * 1024 * 1024; // 5MB
  
  // Initialize upload
  const initResponse = await fetch('https://api.xrcollab.com/v1/api/capture/upload/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      mimeType: 'application/zip',
      chunkSize,
      metadata: {
        captureType: 'room_scan',
        deviceId: await getDeviceId(),
        timestamp: new Date().toISOString()
      }
    })
  });

  const { uploadId, totalChunks } = await initResponse.json();
  
  // Upload chunks
  for (let i = 0; i < totalChunks; i++) {
    const offset = i * chunkSize;
    const chunk = await RNFS.read(filePath, chunkSize, offset, 'base64');
    const checksum = md5(chunk);
    
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', i.toString());
    formData.append('checksum', checksum);
    formData.append('chunk', {
      uri: `data:application/octet-stream;base64,${chunk}`,
      type: 'application/octet-stream',
      name: `chunk_${i}`
    });
    
    const chunkResponse = await fetch('https://api.xrcollab.com/v1/api/capture/upload/chunk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const progress = await chunkResponse.json();
    console.log(`Upload progress: ${progress.percentComplete}%`);
  }
  
  // Complete upload
  const completeResponse = await fetch('https://api.xrcollab.com/v1/api/capture/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      uploadId,
      finalChecksum: await md5File(filePath)
    })
  });

  const result = await completeResponse.json();
  console.log('Capture ID:', result.captureId);
  
  return result;
}
```

---

### Swift (iOS)

```swift
// Device capability detection
func detectDeviceCapability() async throws -> DeviceCapability {
    let deviceInfo = DeviceCapabilityRequest(
        deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "",
        platform: "iOS",
        osVersion: UIDevice.current.systemVersion,
        deviceModel: await UIDevice.current.model,
        cpuCores: ProcessInfo.processInfo.processorCount,
        cpuFrequency: getCPUFrequency(),
        gpuModel: "Apple GPU",
        ramMB: Int(ProcessInfo.processInfo.physicalMemory / 1024 / 1024),
        screenWidth: Int(UIScreen.main.nativeBounds.width),
        screenHeight: Int(UIScreen.main.nativeBounds.height),
        screenDensity: Int(UIScreen.main.scale * 160),
        supportedFeatures: ["ARKit", "LiDAR", "Metal3"],
        batteryLevel: Int(UIDevice.current.batteryLevel * 100),
        thermalState: UIDevice.current.thermalState.rawValue
    )
    
    var request = URLRequest(url: URL(string: "https://api.xrcollab.com/v1/api/device/capability")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONEncoder().encode(deviceInfo)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let capability = try JSONDecoder().decode(DeviceCapability.self, from: data)
    
    print("Device tier: \(capability.tier)")
    print("Recommended LOD: \(capability.capabilities.recommendedLOD)")
    
    return capability
}
```

---

## Summary

These examples demonstrate:

1. **Device capability detection** across different device tiers (Low/Medium/High)
2. **Multi-LOD model retrieval** with caching support
3. **Chunked upload flow** from initialization to completion
4. **Comprehensive error handling** with specific error codes
5. **Client SDK integration** patterns for mobile platforms

All APIs follow RESTful conventions and include proper authentication, error handling, and performance optimizations.
