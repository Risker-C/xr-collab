/**
 * ML_Sharp Photo Capture UI
 * V0.3 单图转3D功能
 * 
 * 功能：
 * - 拍照或选择图片
 * - 上传到ML_Sharp API
 * - 显示生成的3D模型
 */

import { GLTFLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

export class MLSharpUI {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.currentModel = null;
    
    this.initUI();
    this.bindEvents();
  }

  initUI() {
    // 检查是否已存在
    if (document.getElementById('mlsharp-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'mlsharp-panel';
    panel.className = 'control-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>📸 单图转3D</h3>
        <button id="mlsharp-panel-close" class="close-btn">×</button>
      </div>
      
      <div class="mlsharp-section">
        <h4>��照或选择图片</h4>
        
        <div class="upload-area" id="mlsharp-upload-area">
          <div class="upload-icon">📷</div>
          <p>点击拍照或选择图片</p>
          <small>支持 JPG, PNG, WebP</small>
        </div>
        
        <input 
          type="file" 
          id="mlsharp-file-input" 
          accept="image/*" 
          capture="environment"
          style="display: none;"
        />
        
        <div id="mlsharp-preview" style="display: none;">
          <img id="mlsharp-preview-img" style="width: 100%; border-radius: 8px; margin: 12px 0;" />
          <div class="button-group">
            <button id="mlsharp-generate-btn" class="btn btn-primary">
              ✨ 生成3D模型
            </button>
            <button id="mlsharp-reselect-btn" class="btn btn-secondary">
              🔄 重新选择
            </button>
          </div>
        </div>
        
        <div id="mlsharp-progress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="mlsharp-progress-fill"></div>
          </div>
          <p id="mlsharp-status-text">正在生成...</p>
        </div>
        
        <div id="mlsharp-result" style="display: none;">
          <div class="result-card">
            <div class="result-icon">✅</div>
            <h4>生成成功！</h4>
            <p id="mlsharp-result-info"></p>
            <button id="mlsharp-view-btn" class="btn btn-success">
              👁️ 查看模型
            </button>
          </div>
        </div>
      </div>
      
      <style>
        .mlsharp-section {
          padding: 16px 0;
        }
        
        .upload-area {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .upload-area:hover {
          border-color: rgba(102, 126, 234, 0.6);
          background: rgba(102, 126, 234, 0.1);
        }
        
        .upload-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin: 16px 0;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          width: 0%;
          transition: width 0.3s;
        }
        
        .result-card {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        
        .result-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
      </style>
    `;

    document.body.appendChild(panel);
  }

  bindEvents() {
    // 关闭按钮
    const closeBtn = document.getElementById('mlsharp-panel-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.togglePanel();
    }

    // 上传区域点击
    const uploadArea = document.getElementById('mlsharp-upload-area');
    const fileInput = document.getElementById('mlsharp-file-input');
    
    if (uploadArea && fileInput) {
      uploadArea.onclick = () => fileInput.click();
      fileInput.onchange = (e) => this.handleFileSelect(e);
    }

    // 生成按钮
    const generateBtn = document.getElementById('mlsharp-generate-btn');
    if (generateBtn) {
      generateBtn.onclick = () => this.generateModel();
    }

    // 重新选择按钮
    const reselectBtn = document.getElementById('mlsharp-reselect-btn');
    if (reselectBtn) {
      reselectBtn.onclick = () => this.resetUI();
    }

    // 查看模型按钮
    const viewBtn = document.getElementById('mlsharp-view-btn');
    if (viewBtn) {
      viewBtn.onclick = () => this.viewModel();
    }
  }

  togglePanel() {
    const panel = document.getElementById('mlsharp-panel');
    if (!panel) return;

    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      this.resetUI();
    } else {
      panel.style.display = 'none';
    }
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showNotification('请选择图片文件', 'error');
      return;
    }

    this.selectedFile = file;

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('mlsharp-preview-img');
      const previewDiv = document.getElementById('mlsharp-preview');
      const uploadArea = document.getElementById('mlsharp-upload-area');

      if (previewImg && previewDiv && uploadArea) {
        previewImg.src = e.target.result;
        previewDiv.style.display = 'block';
        uploadArea.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  }

  async generateModel() {
    if (!this.selectedFile) return;

    const progressDiv = document.getElementById('mlsharp-progress');
    const previewDiv = document.getElementById('mlsharp-preview');
    const progressFill = document.getElementById('mlsharp-progress-fill');
    const statusText = document.getElementById('mlsharp-status-text');

    if (previewDiv) previewDiv.style.display = 'none';
    if (progressDiv) progressDiv.style.display = 'block';

    try {
      // 模拟进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90 && progressFill) {
          progressFill.style.width = progress + '%';
        }
      }, 500);

      // 上传到ML_Sharp API
      const formData = new FormData();
      formData.append('image', this.selectedFile);

      const response = await fetch('/api/ml-sharp/generate', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成失败');
      }

      const { modelUrl, metadata } = await response.json();

      // 完成进度
      if (progressFill) progressFill.style.width = '100%';

      // 保存结果
      this.currentModelUrl = modelUrl;
      this.currentMetadata = metadata;

      // 显示结果
      setTimeout(() => {
        this.showResult(metadata);
      }, 500);

    } catch (error) {
      console.error('生成失败:', error);
      this.showNotification(error.message || '生成失败', 'error');
      this.resetUI();
    }
  }

  showResult(metadata) {
    const progressDiv = document.getElementById('mlsharp-progress');
    const resultDiv = document.getElementById('mlsharp-result');
    const resultInfo = document.getElementById('mlsharp-result-info');

    if (progressDiv) progressDiv.style.display = 'none';
    if (resultDiv) resultDiv.style.display = 'block';

    if (resultInfo) {
      const info = [
        `房间类型: ${this.getRoomTypeLabel(metadata.roomType)}`,
        `处理时间: ${(metadata.processingTime / 1000).toFixed(1)}秒`,
        `模型大小: ${this.formatBytes(metadata.modelSize)}`
      ].join(' · ');
      resultInfo.textContent = info;
    }
  }

  async viewModel() {
    if (!this.currentModelUrl) return;

    try {
      // 加载GLB模型
      const loader = new GLTFLoader();
      
      loader.load(
        this.currentModelUrl,
        (gltf) => {
          // 移除旧模型
          if (this.currentModel) {
            this.scene.remove(this.currentModel);
          }

          // 添加新模型
          this.currentModel = gltf.scene;
          
          // 设置位置（在相机前方）
          const cameraDirection = new THREE.Vector3();
          this.camera.getWorldDirection(cameraDirection);
          
          this.currentModel.position.copy(this.camera.position);
          this.currentModel.position.add(cameraDirection.multiplyScalar(3));
          this.currentModel.position.y = 0;

          // 缩放到合适大小
          const box = new THREE.Box3().setFromObject(this.currentModel);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          this.currentModel.scale.setScalar(scale);

          this.scene.add(this.currentModel);

          this.showNotification('模型已加载到场景中', 'success');
          this.togglePanel();
        },
        (progress) => {
          console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
        },
        (error) => {
          console.error('模型加载失败:', error);
          this.showNotification('模型加载失败', 'error');
        }
      );

    } catch (error) {
      console.error('查看模型失败:', error);
      this.showNotification('查看模型失败', 'error');
    }
  }

  resetUI() {
    const uploadArea = document.getElementById('mlsharp-upload-area');
    const previewDiv = document.getElementById('mlsharp-preview');
    const progressDiv = document.getElementById('mlsharp-progress');
    const resultDiv = document.getElementById('mlsharp-result');
    const fileInput = document.getElementById('mlsharp-file-input');

    if (uploadArea) uploadArea.style.display = 'block';
    if (previewDiv) previewDiv.style.display = 'none';
    if (progressDiv) progressDiv.style.display = 'none';
    if (resultDiv) resultDiv.style.display = 'none';
    if (fileInput) fileInput.value = '';

    this.selectedFile = null;
  }

  getRoomTypeLabel(type) {
    const labels = {
      'living_room': '客厅',
      'bedroom': '卧室',
      'kitchen': '厨房',
      'bathroom': '浴室',
      'unknown': '未知'
    };
    return labels[type] || type;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  showNotification(message, type = 'info') {
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
    const panel = document.getElementById('mlsharp-panel');
    if (panel) panel.remove();

    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
  }
}

// 导出为全局变量
if (typeof window !== 'undefined') {
  window.MLSharpUI = MLSharpUI;
}
