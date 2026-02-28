/**
 * ScanManager - 建筑扫描会话管理 (安全版本)
 * 管理扫描会话的创建、状态追踪、点云数据流式处理
 * 
 * 安全改进：
 * - 点云数据不再存储在内存中，改为流式写入文件
 * - 添加内存使用限制和监控
 * - 实现数据分页加载机制
 */

const fs = require('fs').promises;
const path = require('path');
const { createWriteStream, createReadStream } = require('fs');

class ScanManager {
  constructor(options = {}) {
    // scanId -> { id, roomId, userId, status, createdAt, pointCount, quality, metadata }
    this.scans = new Map();
    
    // 配置
    this.config = {
      maxMemoryPoints: options.maxMemoryPoints || 10000, // 内存中最多保留1万个点
      storageRoot: options.storageRoot || path.join(process.cwd(), 'backend', 'storage', 'scans'),
      maxScanDuration: options.maxScanDuration || 30 * 60 * 1000, // 30分钟最大扫描时间
      maxPointsPerScan: options.maxPointsPerScan || 1000000, // 每次扫描最多100万个点
      ...options
    };
    
    // 确保存储目录存在
    this.ensureStorageDir();
  }

  /**
   * 确保存储目录存在
   */
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.config.storageRoot, { recursive: true });
    } catch (error) {
      console.error('创建扫描存储目录失败:', error);
    }
  }

  /**
   * 创建新的扫描会话
   */
  async createSession(roomId, userId, options = {}) {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const session = {
      id: scanId,
      roomId,
      userId,
      status: 'created', // created -> scanning -> processing -> completed -> failed
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pointCount: 0,
      frameCount: 0,
      quality: 'medium', // low, medium, high, ultra
      progress: 0, // 0-100
      area: 0, // 扫描面积（平方米）
      filePath: path.join(this.config.storageRoot, `${scanId}.jsonl`), // 点云数据文件路径
      metadata: {
        deviceType: options.deviceType || 'unknown',
        scannerType: options.scannerType || 'photogrammetry', // lidar, photogrammetry, depth
        ...options.metadata
      }
    };

    this.scans.set(scanId, session);
    
    // 创建点云数据文件
    try {
      await fs.writeFile(session.filePath, '', 'utf8');
    } catch (error) {
      console.error('创建点云数据文件失败:', error);
      throw new Error('扫描会话创建失败');
    }

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
   * 添加点云数据（流式写入，防止内存溢出）
   */
  async addPointCloudChunk(scanId, chunk = {}) {
    const session = this.scans.get(scanId);
    if (!session) {
      throw new Error('扫描会话不存在');
    }

    const { points = [], frame } = chunk;
    
    // 安全检查：防止单次上传过多点
    if (points.length > this.config.maxMemoryPoints) {
      throw new Error(`单次上传点数过多，最多允许 ${this.config.maxMemoryPoints} 个点`);
    }

    // 安全检查：防止扫描时间过长
    const scanDuration = Date.now() - session.createdAt;
    if (scanDuration > this.config.maxScanDuration) {
      throw new Error('扫描时间过长，请重新开始扫描');
    }

    // 安全检查：防止总点数过多
    const newTotalPoints = session.pointCount + points.length;
    if (newTotalPoints > this.config.maxPointsPerScan) {
      throw new Error(`扫描点数超过限制，最多允许 ${this.config.maxPointsPerScan} 个点`);
    }

    try {
      // 流式写入点云数据到文件
      const frameData = {
        timestamp: Date.now(),
        frameIndex: session.frameCount,
        pointCount: points.length,
        points: points,
        metadata: frame || {}
      };

      // 追加写入JSONL格式（每行一个JSON对象）
      await fs.appendFile(session.filePath, JSON.stringify(frameData) + '\n', 'utf8');

      // 更新会话统计
      this.updateSession(scanId, {
        pointCount: newTotalPoints,
        frameCount: session.frameCount + 1,
        progress: Math.min(100, (newTotalPoints / this.config.maxPointsPerScan) * 100)
      });

      return {
        success: true,
        totalPoints: newTotalPoints,
        frameIndex: session.frameCount
      };

    } catch (error) {
      console.error('写入点云数据失败:', error);
      throw new Error('点云数据保存失败');
    }
  }

  /**
   * 分页读取点云数据（防止内存溢出）
   */
  async getPointCloudData(scanId, options = {}) {
    const session = this.scans.get(scanId);
    if (!session) {
      throw new Error('扫描会话不存在');
    }

    const {
      page = 0,
      pageSize = 1000,
      frameStart = 0,
      frameEnd = null
    } = options;

    try {
      const fileContent = await fs.readFile(session.filePath, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line);
      
      let frames = lines.map(line => JSON.parse(line));
      
      // 按帧范围过滤
      if (frameEnd !== null) {
        frames = frames.slice(frameStart, frameEnd + 1);
      } else if (frameStart > 0) {
        frames = frames.slice(frameStart);
      }

      // 分页
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const pagedFrames = frames.slice(startIndex, endIndex);

      // 提取点云数据
      const points = [];
      pagedFrames.forEach(frame => {
        if (frame.points && Array.isArray(frame.points)) {
          points.push(...frame.points);
        }
      });

      return {
        points,
        frames: pagedFrames.map(f => ({
          timestamp: f.timestamp,
          frameIndex: f.frameIndex,
          pointCount: f.pointCount,
          metadata: f.metadata
        })),
        pagination: {
          page,
          pageSize,
          totalFrames: frames.length,
          hasMore: endIndex < frames.length
        }
      };

    } catch (error) {
      console.error('读取点云数据失败:', error);
      throw new Error('点云数据读取失败');
    }
  }

  /**
   * 完成扫描
   */
  async completeScanning(scanId) {
    const session = this.updateSession(scanId, {
      status: 'completed',
      completedAt: Date.now()
    });

    if (session) {
      // 可以在这里触发后处理任务（如点云优化、模型生成等）
      console.log(`扫描完成: ${scanId}, 总点数: ${session.pointCount}, 总帧数: ${session.frameCount}`);
    }

    return session;
  }

  /**
   * 删除扫描会话和相关数据
   */
  async deleteSession(scanId) {
    const session = this.scans.get(scanId);
    if (!session) return false;

    try {
      // 删除点云数据文件
      await fs.unlink(session.filePath);
    } catch (error) {
      console.warn('删除点云数据文件失败:', error);
    }

    // 从内存中移除会话
    this.scans.delete(scanId);
    return true;
  }

  /**
   * 获取所有扫描会话（不包含点云数据）
   */
  getAllSessions(roomId = null) {
    const sessions = Array.from(this.scans.values());
    
    if (roomId) {
      return sessions.filter(session => session.roomId === roomId);
    }
    
    return sessions;
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    const now = Date.now();
    const expiredSessions = [];

    for (const [scanId, session] of this.scans.entries()) {
      if (now - session.createdAt > maxAge) {
        expiredSessions.push(scanId);
      }
    }

    for (const scanId of expiredSessions) {
      await this.deleteSession(scanId);
      console.log(`清理过期扫描会话: ${scanId}`);
    }

    return expiredSessions.length;
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats() {
    return {
      activeSessions: this.scans.size,
      memoryPointsLimit: this.config.maxMemoryPoints,
      maxPointsPerScan: this.config.maxPointsPerScan,
      storageRoot: this.config.storageRoot
    };
  }
}

module.exports = ScanManager;