/**
 * ScanManager - 建筑扫描会话管理
 * 管理扫描会话的创建、状态追踪、点云数据处理
 */

class ScanManager {
  constructor() {
    // scanId -> { id, roomId, userId, status, createdAt, pointCount, quality, metadata }
    this.scans = new Map();
    // scanId -> { points: [[x,y,z,r,g,b]], metadata }
    this.pointClouds = new Map();
  }

  /**
   * 创建新的扫描会话
   */
  createSession(roomId, userId, options = {}) {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const session = {
      id: scanId,
      roomId,
      userId,
      status: 'created', // created -> scanning -> processing -> completed -> failed
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pointCount: 0,
      quality: 'medium', // low, medium, high, ultra
      progress: 0, // 0-100
      area: 0, // 扫描面积（平方米）
      metadata: {
        deviceType: options.deviceType || 'unknown',
        scannerType: options.scannerType || 'photogrammetry', // lidar, photogrammetry, depth
        ...options.metadata
      }
    };

    this.scans.set(scanId, session);
    this.pointClouds.set(scanId, { points: [], frames: [] });

    return session;
  }

  /**
   * 获取扫描会话
   */
  getSession(scanId) {
    return this.scans.get(scanId) || null;
  }

  /**
   * 更新扫描会话状态
   */
  updateSession(scanId, updates = {}) {
    const session = this.scans.get(scanId);
    if (!session) return null;

    Object.assign(session, updates, {
      updatedAt: Date.now()
    });

    this.scans.set(scanId, session);
    return session;
  }

  /**
   * 开始扫描
   */
  startScanning(scanId) {
    return this.updateSession(scanId, {
      status: 'scanning',
      startedAt: Date.now()
    });
  }

  /**
   * 添加点云数据（分块上传）
   */
  addPointCloudChunk(scanId, chunk = {}) {
    const pointCloud = this.pointClouds.get(scanId);
    if (!pointCloud) return null;

    const { points = [], frame } = chunk;
    
    // 添加点云数据
    if (points.length > 0) {
      pointCloud.points.push(...points);
    }

    // 记录帧信息
    if (frame) {
      pointCloud.frames.push({
        timestamp: Date.now(),
        pointCount: points.length,
        ...frame
      });
    }

    this.pointClouds.set(scanId, pointCloud);

    // 更新会话统计
    const session = this.getSession(scanId);
    if (session) {
      session.pointCount = pointCloud.points.length;
      session.updatedAt = Date.now();
      this.scans.set(scanId, session);
    }

    return {
      totalPoints: pointCloud.points.length,
      framesCount: pointCloud.frames.length
    };
  }

  /**
   * 完成扫描
   */
  completeScanning(scanId) {
    const session = this.updateSession(scanId, {
      status: 'processing',
      completedAt: Date.now()
    });

    if (!session) return null;

    // 启动后台处理（简化版：直接标记为完成）
    setTimeout(() => {
      this.updateSession(scanId, {
        status: 'completed',
        processedAt: Date.now()
      });
    }, 1000);

    return session;
  }

  /**
   * 获取点云数据
   */
  getPointCloud(scanId, options = {}) {
    const pointCloud = this.pointClouds.get(scanId);
    if (!pointCloud) return null;

    const { limit = 50000, offset = 0 } = options;
    
    return {
      scanId,
      totalPoints: pointCloud.points.length,
      points: pointCloud.points.slice(offset, offset + limit),
      hasMore: offset + limit < pointCloud.points.length
    };
  }

  /**
   * 获取房间的所有扫描
   */
  getRoomScans(roomId) {
    const scans = [];
    for (const scan of this.scans.values()) {
      if (scan.roomId === roomId) {
        scans.push(scan);
      }
    }
    return scans.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 删除扫描
   */
  deleteSession(scanId) {
    const session = this.scans.get(scanId);
    this.scans.delete(scanId);
    this.pointClouds.delete(scanId);
    return session;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalScans: this.scans.size,
      activeScans: Array.from(this.scans.values()).filter(s => s.status === 'scanning').length,
      totalPointClouds: this.pointClouds.size
    };
  }
}

module.exports = ScanManager;
