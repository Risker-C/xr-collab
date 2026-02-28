/**
 * ScanningUI - 建筑扫描用户界面
 * 提供扫描控制、进度显示、结果管理
 */

export class ScanningUI {
  constructor(socket, scene, camera) {
    this.socket = socket;
    this.scene = scene;
    this.camera = camera;
    this.currentScan = null;
    this.scanHistory = [];
    this.isScanning = false;
    
    this.initUI();
    this.bindEvents();
  }

  initUI() {
    // 检查是否已存在扫描面板
    if (document.getElementById('scan-panel')) return;

    // 创建扫描控制面板
    const panel = document.createElement('div');
    panel.id = 'scan-panel';
    panel.className = 'control-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>🏢 建筑扫描</h3>
        <button id="scan-panel-close" class="close-btn">×</button>
      </div>
      
      <div class="scan-section">
        <h4>扫描控制</h4>
        <div class="scan-status-card" id="scan-status-card">
          <div class="status-text">状态: <span id="scan-status">就绪</span></div>
          <div class="scan-info" id="scan-info" style="display: none;">
            <div>进度: <span id="scan-progress">0</span>%</div>
            <div>点数: <span id="scan-points">0</span></div>
            <div>质量: <span id="scan-quality">-</span></div>
          </div>
        </div>
        
        <div class="scan-controls">
          <button id="scan-start-btn" class="btn btn-primary">
            <span class="icon">▶️</span> 开始扫描
          </button>
          <button id="scan-pause-btn" class="btn btn-secondary" style="display: none;">
            <span class="icon">⏸️</span> 暂停
          </button>
          <button id="scan-complete-btn" class="btn btn-success" style="display: none;">
            <span class="icon">✅</span> 完成
          </button>
        </div>
        
        <div class="scan-tips" id="scan-tips">
          <small>💡 提示: 缓慢移动设备，确保覆盖所有区域</small>
        </div>
      </div>
      
      <hr>
      
      <div class="scan-section">
        <h4>📋 扫描历史</h4>
        <div id="scan-history-list" class="scan-history-list">
          <div class="empty-state">暂无扫描记录</div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 添加扫描按钮到主控制面板
    this.addScanButton();
  }

  addScanButton() {
    const controls = document.getElementById('controls');
    if (!controls) {
      console.warn('Controls panel not found');
      return;
    }

    // 检查是否已存在
    if (document.getElementById('scan-toggle-btn')) return;

    const scanBtn = document.createElement('button');
    scanBtn.id = 'scan-toggle-btn';
    scanBtn.className = 'btn-scan';
    scanBtn.innerHTML = '🏢 扫描';
    scanBtn.onclick = () => this.togglePanel();
    scanBtn.style.cssText = `
      width: 100%;
      margin-bottom: 12px;
    `;

    // 插入到控制面板
    const firstH4 = controls.querySelector('h4');
    if (firstH4) {
      controls.insertBefore(scanBtn, firstH4);
    } else if (controls.firstChild && controls.firstChild.nodeType === 1) {
      // firstChild存在且是元素节点
      controls.insertBefore(scanBtn, controls.firstChild);
    } else {
      // 安全fallback：直接appendChild
      controls.appendChild(scanBtn);
    }
    
    console.log('✅ Scan button added');
  }

  bindEvents() {
    // UI 事件
    const closeBtn = document.getElementById('scan-panel-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.togglePanel();
    }

    const startBtn = document.getElementById('scan-start-btn');
    if (startBtn) {
      startBtn.onclick = () => this.startScan();
    }

    const pauseBtn = document.getElementById('scan-pause-btn');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.pauseScan();
    }

    const completeBtn = document.getElementById('scan-complete-btn');
    if (completeBtn) {
      completeBtn.onclick = () => this.completeScan();
    }

    // Socket 事件
    this.socket.on('scan:created', (data) => this.onScanCreated(data));
    this.socket.on('scan:state', (data) => this.onScanState(data));
    this.socket.on('scan:progress', (data) => this.onScanProgress(data));
    this.socket.on('scan:completed', (data) => this.onScanCompleted(data));
    this.socket.on('scan:error', (data) => this.onScanError(data));
    this.socket.on('scan:list', (data) => this.onScanList(data));
  }

  togglePanel() {
    const panel = document.getElementById('scan-panel');
    if (!panel) return;

    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      this.refreshScanHistory();
    } else {
      panel.style.display = 'none';
    }
  }

  startScan() {
    if (this.isScanning) return;

    // 创建新的扫描会话
    this.socket.emit('scan:create', {
      deviceType: this.detectDeviceType(),
      scannerType: 'photogrammetry',
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    });
  }

  pauseScan() {
    if (!this.currentScan) return;

    this.socket.emit('scan:pause', {
      scanId: this.currentScan.id
    });

    this.updateUI('paused');
  }

  completeScan() {
    if (!this.currentScan) return;

    this.socket.emit('scan:complete', {
      scanId: this.currentScan.id
    });

    this.updateUI('processing');
  }

  onScanCreated(data) {
    this.currentScan = data;
    this.isScanning = true;

    // 自动开始扫描
    this.socket.emit('scan:start', {
      scanId: data.id
    });

    this.updateUI('scanning');
    this.startPointCloudCapture();
  }

  onScanState(data) {
    if (this.currentScan && this.currentScan.id === data.scanId) {
      this.currentScan.status = data.status;
      this.updateUI(data.status);
    }
  }

  onScanProgress(data) {
    if (!this.currentScan || this.currentScan.id !== data.scanId) return;

    const progressEl = document.getElementById('scan-progress');
    const pointsEl = document.getElementById('scan-points');
    const qualityEl = document.getElementById('scan-quality');

    if (progressEl) progressEl.textContent = Math.round(data.progress || 0);
    if (pointsEl) pointsEl.textContent = this.formatNumber(data.pointCount || 0);
    if (qualityEl) {
      const quality = data.quality || 'medium';
      qualityEl.textContent = this.getQualityLabel(quality);
      qualityEl.className = `quality-badge quality-${quality}`;
    }
  }

  onScanCompleted(data) {
    if (!this.currentScan || this.currentScan.id !== data.scanId) return;

    this.isScanning = false;
    this.currentScan = null;
    this.updateUI('completed');

    // 刷新历史列表
    this.refreshScanHistory();

    // 显示完成提示
    this.showNotification('扫描完成！', 'success');
  }

  onScanError(data) {
    console.error('Scan error:', data);
    this.showNotification(data.message || '扫描出错', 'error');
    this.updateUI('error');
  }

  onScanList(data) {
    this.scanHistory = data.scans || [];
    this.renderScanHistory();
  }

  updateUI(status) {
    const statusEl = document.getElementById('scan-status');
    const infoEl = document.getElementById('scan-info');
    const startBtn = document.getElementById('scan-start-btn');
    const pauseBtn = document.getElementById('scan-pause-btn');
    const completeBtn = document.getElementById('scan-complete-btn');
    const tipsEl = document.getElementById('scan-tips');

    const statusMap = {
      'ready': '就绪',
      'created': '已创建',
      'scanning': '扫描中...',
      'paused': '已暂停',
      'processing': '处理中...',
      'completed': '已完成',
      'failed': '失败',
      'error': '错误'
    };

    if (statusEl) {
      statusEl.textContent = statusMap[status] || status;
      statusEl.className = `status-${status}`;
    }

    // 显示/隐藏元素
    if (status === 'scanning' || status === 'paused') {
      if (infoEl) infoEl.style.display = 'block';
      if (startBtn) startBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'inline-block';
      if (completeBtn) completeBtn.style.display = 'inline-block';
      if (tipsEl) tipsEl.style.display = 'block';
    } else {
      if (infoEl) infoEl.style.display = 'none';
      if (startBtn) startBtn.style.display = 'inline-block';
      if (pauseBtn) pauseBtn.style.display = 'none';
      if (completeBtn) completeBtn.style.display = 'none';
      if (tipsEl) tipsEl.style.display = 'none';
    }

    // 更新按钮状态
    if (pauseBtn) {
      pauseBtn.innerHTML = status === 'paused' 
        ? '<span class="icon">▶️</span> 继续'
        : '<span class="icon">⏸️</span> 暂停';
    }
  }

  startPointCloudCapture() {
    if (!this.currentScan) return;

    // 模拟点云采集（实际应该从WebXR Depth API获取）
    this.captureInterval = setInterval(() => {
      if (!this.isScanning || !this.currentScan) {
        clearInterval(this.captureInterval);
        return;
      }

      // 生成模拟点云数据
      const points = this.generateMockPointCloud(100);
      
      // 上传点云数据
      this.socket.emit('scan:upload-chunk', {
        scanId: this.currentScan.id,
        points: points,
        frame: {
          timestamp: Date.now(),
          cameraPosition: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
          },
          cameraRotation: {
            x: this.camera.rotation.x,
            y: this.camera.rotation.y,
            z: this.camera.rotation.z
          }
        }
      });
    }, 100); // 每100ms采集一次
  }

  generateMockPointCloud(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push([
        (Math.random() - 0.5) * 10, // x
        (Math.random() - 0.5) * 10, // y
        (Math.random() - 0.5) * 10, // z
        Math.floor(Math.random() * 256), // r
        Math.floor(Math.random() * 256), // g
        Math.floor(Math.random() * 256)  // b
      ]);
    }
    return points;
  }

  refreshScanHistory() {
    this.socket.emit('scan:list', {});
  }

  renderScanHistory() {
    const listEl = document.getElementById('scan-history-list');
    if (!listEl) return;

    if (this.scanHistory.length === 0) {
      listEl.innerHTML = '<div class="empty-state">暂无扫描记录</div>';
      return;
    }

    listEl.innerHTML = this.scanHistory.map(scan => `
      <div class="scan-history-item" data-scan-id="${scan.id}">
        <div class="scan-info">
          <div class="scan-name">${this.formatScanName(scan)}</div>
          <div class="scan-meta">
            <span>${this.formatNumber(scan.pointCount)} 点</span>
            <span>${this.getQualityLabel(scan.quality)}</span>
            <span>${this.formatDate(scan.createdAt)}</span>
          </div>
        </div>
        <div class="scan-actions">
          <button class="btn-icon" onclick="window.scanUI.loadScan('${scan.id}')" title="加载">
            👁️
          </button>
          <button class="btn-icon" onclick="window.scanUI.deleteScan('${scan.id}')" title="删除">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  loadScan(scanId) {
    this.socket.emit('scan:load', { scanId });
    this.showNotification('正在加载扫描数据...', 'info');
  }

  deleteScan(scanId) {
    if (!confirm('确定要删除这个扫描吗？')) return;
    
    this.socket.emit('scan:delete', { scanId });
    this.refreshScanHistory();
  }

  detectDeviceType() {
    const ua = navigator.userAgent;
    if (/Quest/i.test(ua)) return 'quest';
    if (/iPhone|iPad/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    
    return date.toLocaleDateString('zh-CN');
  }

  formatScanName(scan) {
    const date = new Date(scan.createdAt);
    return `扫描_${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}`;
  }

  getQualityLabel(quality) {
    const labels = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'ultra': '超高'
    };
    return labels[quality] || quality;
  }

  showNotification(message, type = 'info') {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  destroy() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }

    const panel = document.getElementById('scan-panel');
    if (panel) panel.remove();

    const btn = document.getElementById('scan-toggle-btn');
    if (btn) btn.remove();
  }
}

// 导出为全局变量以便HTML调用
if (typeof window !== 'undefined') {
  window.ScanningUI = ScanningUI;
}
