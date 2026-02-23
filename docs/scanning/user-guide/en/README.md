# XR Collab Scanning Feature User Guide

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Web Scanning](#web-scanning)
3. [Mobile Scanning](#mobile-scanning)
4. [Viewing Results](#viewing-results)
5. [Collaborative Scanning](#collaborative-scanning)
6. [FAQ](#faq)

---

## Quick Start

### What is Building Scanning?

XR Collab's building scanning feature allows you to 3D scan real architectural spaces using WebXR devices or mobile devices (iOS/Android), generating high-precision point clouds and mesh models that can be shared in real-time within multi-user collaboration rooms.

### Supported Devices

- **Web**: WebXR-enabled browsers (Chrome, Edge, Firefox)
- **iOS**: iPhone 12 and above (LiDAR-equipped devices work best)
- **Android**: ARCore-compatible devices (Android 7.0+)

### Scanning Workflow

```
Create Session → Start Capture → Live Preview → Upload & Process → View Results → Publish to Room
```

---

## Web Scanning

### 1. Enter Scanning Mode

1. Open XR Collab application
2. Join or create a collaboration room
3. Click "Scan" button in toolbar
4. Select "Start New Scan"

### 2. Configure Scan Parameters

```
Quality: High/Medium/Low
Capture Mode: Photogrammetry/Live Preview
Enable Depth: Yes/No (if device supports)
```

**Recommended Settings**:
- First-time users: Medium quality
- Small rooms: High quality
- Large scenes: Medium quality + zone scanning

### 3. Start Capture

1. Click "Start Capture" button
2. Move device slowly and steadily
3. Ensure scene overlap ≥ 70%
4. Follow on-screen quality indicators

**Capture Tips**:
- Maintain 1.5-3m scanning distance
- Avoid rapid movement (1-2 sec/frame recommended)
- Ensure sufficient and even lighting
- Avoid reflective surfaces

### 4. Live Preview

During capture, you'll see:
- Current frame count
- Coverage area preview (green = covered)
- Quality score (blur, overlap)
- Estimated completion time

### 5. Complete Capture

1. Confirm all target areas covered
2. Click "Complete Capture"
3. System auto-uploads data
4. Wait for background processing (typically 5-15 min)

---

## Mobile Scanning

### iOS Scanning Steps

#### 1. Install App
```bash
# Install via TestFlight or App Store
```

#### 2. Launch Scan
```
Open App → Select Room → Tap "Scan" → Grant Camera & Sensor Permissions
```

#### 3. Scan Settings
- **High Quality**: For small detailed scenes (< 50㎡)
- **Balanced**: For medium rooms (50-200㎡)
- **Fast**: For large scene previews

#### 4. Capture Guidance
App displays real-time:
- AR guide lines (suggested movement path)
- Coverage heatmap
- Quality warnings (blur, overexposure, etc.)

### Android Scanning Steps

Similar to iOS, but note:
- First use requires ARCore service download
- Some devices don't support depth capture
- High-end devices recommended (Snapdragon 8 series)

---

## Viewing Results

### 1. View Scan List

```
My Scans → Select Session → View Details
```

Information displayed:
- Scan time and location
- Processing status (Processing/Complete/Failed)
- Point count, mesh face count
- Available LOD levels

### 2. 3D Preview

Click "Preview" button:
- Rotate: Single-finger drag
- Zoom: Pinch gesture
- Pan: Two-finger drag
- Switch LOD: Top-right dropdown

### 3. Download Model

Supported formats:
- **glTF/GLB**: Recommended, supports textures and compression
- **PLY**: Point cloud format
- **OBJ**: Universal mesh format

```javascript
// Download example
scanAPI.download(scanId, {
  format: 'glb',
  lod: 1,
  includeTexture: true
});
```

---

## Collaborative Scanning

### Multi-User Scanning

1. Multiple users in room can create scan sessions simultaneously
2. Each user's scan progress syncs in real-time
3. Multiple scan results can be merged after completion

### Live Preview Sharing

Enable "Share Preview" option:
- Other users see your scan progress in real-time
- Displayed as semi-transparent point cloud overlay
- Helps team coordinate scanning areas

### Publishing Results

```
Select Scan → Click "Publish to Room" → Set Anchor Position → Confirm
```

After publishing:
- All room members can view
- Supports annotation and measurement
- Can export as collaborative asset

---

## FAQ

### Q: What if scanning fails?
**A**: Check the following:
1. Is network connection stable?
2. Are there enough capture frames? (recommend > 50)
3. Does scene have sufficient texture features?
4. Check error logs for details

### Q: How to improve scan quality?
**A**: 
- Increase frame count and overlap
- Ensure even lighting
- Avoid dynamic objects (people, vehicles)
- Use high-quality mode

### Q: Where is scan data stored?
**A**: 
- Raw data: Cloud object storage (S3)
- Processed results: CDN distribution
- Local cache: Browser IndexedDB (can be cleared)

### Q: Does it support offline scanning?
**A**: 
- Capture can be done offline
- Upload requires network connection
- Supports resumable upload

### Q: How is scan data billed?
**A**: 
- Storage: Per GB/month
- Processing: Per scan session
- Download: Per bandwidth usage
- See pricing page for details

---

## Next Steps

- Check [Developer Docs](../../developer/en/README.md) for API interfaces
- Read [Best Practices](../../best-practices/en/README.md) to improve scan quality
- Having issues? See [Troubleshooting Guide](../../troubleshooting/en/README.md)
