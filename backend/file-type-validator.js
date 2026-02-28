/**
 * File Type Validator
 * 文件类型安全验证
 * 
 * 通过文件头（Magic Numbers）验证真实文件类型
 * 防止恶意文件伪装成图片等安全文件类型
 */

const fs = require('fs').promises;

// 常见文件类型的Magic Numbers
const FILE_SIGNATURES = {
  // 图片格式
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1]
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'image/bmp': [[0x42, 0x4D]],
  'image/tiff': [
    [0x49, 0x49, 0x2A, 0x00], // Little endian
    [0x4D, 0x4D, 0x00, 0x2A]  // Big endian
  ],

  // 3D模型格式
  'model/gltf-binary': [[0x67, 0x6C, 0x54, 0x46]], // glTF
  'application/octet-stream': [], // GLB等二进制格式（需要特殊处理）

  // 文档格式
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  
  // 压缩格式
  'application/zip': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08]
  ],

  // 危险格式（应该被阻止）
  'application/x-executable': [
    [0x4D, 0x5A], // Windows PE
    [0x7F, 0x45, 0x4C, 0x46] // Linux ELF
  ],
  'application/x-msdos-program': [[0x4D, 0x5A]],
  'text/html': [
    [0x3C, 0x68, 0x74, 0x6D, 0x6C], // <html
    [0x3C, 0x48, 0x54, 0x4D, 0x4C], // <HTML
    [0x3C, 0x21, 0x44, 0x4F, 0x43] // <!DOC
  ]
};

// 危险文件类型黑名单
const DANGEROUS_TYPES = [
  'application/x-executable',
  'application/x-msdos-program',
  'application/x-msdownload',
  'application/x-sh',
  'application/x-csh',
  'text/html',
  'text/javascript',
  'application/javascript'
];

class FileTypeValidator {
  /**
   * 验证文件类型
   * @param {Buffer} buffer - 文件内容buffer
   * @param {string} declaredMimeType - 客户端声明的MIME类型
   * @param {string} filename - 文件名
   * @returns {Object} 验证结果
   */
  static async validateFileType(buffer, declaredMimeType, filename = '') {
    try {
      // 检测真实文件类型
      const detectedType = this.detectFileType(buffer);
      
      // 检查是否为危险文件类型
      const isDangerous = this.isDangerousFile(detectedType, filename);
      
      // 验证声明类型与实际类型是否匹配
      const isTypeMatch = this.isTypeMatch(declaredMimeType, detectedType);
      
      return {
        valid: !isDangerous && isTypeMatch,
        declaredType: declaredMimeType,
        detectedType: detectedType,
        isDangerous: isDangerous,
        isTypeMatch: isTypeMatch,
        reason: this.getValidationReason(isDangerous, isTypeMatch, declaredMimeType, detectedType)
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message,
        reason: '文件类型检测失败'
      };
    }
  }

  /**
   * 通过文件头检测文件类型
   */
  static detectFileType(buffer) {
    if (!buffer || buffer.length < 4) {
      return 'unknown';
    }

    // 转换为字节数组进行比较
    const bytes = Array.from(buffer.slice(0, 16));

    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (this.matchesSignature(bytes, signature)) {
          return mimeType;
        }
      }
    }

    // 特殊处理：检查是否为文本文件
    if (this.isTextFile(buffer)) {
      return 'text/plain';
    }

    return 'unknown';
  }

  /**
   * 检查字节序列是否匹配签名
   */
  static matchesSignature(bytes, signature) {
    if (signature.length > bytes.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      // null表示跳过该字节的检查
      if (signature[i] !== null && bytes[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查是否为文本文件
   */
  static isTextFile(buffer) {
    // 检查前1024字节是否都是可打印字符
    const sample = buffer.slice(0, Math.min(1024, buffer.length));
    
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // 允许的字符：可打印ASCII字符 + 常见控制字符
      if (!(
        (byte >= 32 && byte <= 126) || // 可打印ASCII
        byte === 9 ||  // Tab
        byte === 10 || // LF
        byte === 13 || // CR
        byte === 0     // NULL (某些文本文件可能包含)
      )) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查是否为危险文件
   */
  static isDangerousFile(detectedType, filename) {
    // 检查MIME类型黑名单
    if (DANGEROUS_TYPES.includes(detectedType)) {
      return true;
    }

    // 检查文件扩展名黑名单
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
      '.js', '.vbs', '.jar', '.app', '.deb', '.rpm',
      '.sh', '.csh', '.pl', '.py', '.rb'
    ];

    const ext = filename.toLowerCase().split('.').pop();
    if (ext && dangerousExtensions.includes('.' + ext)) {
      return true;
    }

    return false;
  }

  /**
   * 检查声明类型与检测类型是否匹配
   */
  static isTypeMatch(declaredType, detectedType) {
    // 如果检测不出类型，允许通过（但会在其他地方限制）
    if (detectedType === 'unknown') {
      return true;
    }

    // 精确匹配
    if (declaredType === detectedType) {
      return true;
    }

    // 兼容性匹配
    const compatibleTypes = {
      'image/jpg': 'image/jpeg',
      'image/jpe': 'image/jpeg',
      'application/octet-stream': ['model/gltf-binary', 'unknown']
    };

    if (compatibleTypes[declaredType]) {
      const compatible = compatibleTypes[declaredType];
      if (Array.isArray(compatible)) {
        return compatible.includes(detectedType);
      }
      return compatible === detectedType;
    }

    return false;
  }

  /**
   * 获取验证失败原因
   */
  static getValidationReason(isDangerous, isTypeMatch, declaredType, detectedType) {
    if (isDangerous) {
      return `危险文件类型: ${detectedType}`;
    }

    if (!isTypeMatch) {
      return `文件类型不匹配: 声明为 ${declaredType}，实际为 ${detectedType}`;
    }

    return '验证通过';
  }

  /**
   * 创建multer文件过滤器
   */
  static createMulterFilter(allowedTypes = ['image/*']) {
    return async (req, file, cb) => {
      try {
        // 首先检查声明的MIME类型
        const isDeclaredTypeAllowed = allowedTypes.some(allowed => {
          if (allowed.endsWith('/*')) {
            const category = allowed.slice(0, -2);
            return file.mimetype.startsWith(category + '/');
          }
          return file.mimetype === allowed;
        });

        if (!isDeclaredTypeAllowed) {
          return cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
        }

        // 注意：在multer阶段我们还没有完整的文件内容
        // 真正的文件头验证需要在文件完全上传后进行
        cb(null, true);

      } catch (error) {
        cb(error, false);
      }
    };
  }

  /**
   * Express中间件：验证上传的文件
   */
  static createValidationMiddleware(options = {}) {
    const { allowedTypes = ['image/*'], maxSize = 10 * 1024 * 1024 } = options;

    return async (req, res, next) => {
      if (!req.file && !req.files) {
        return next();
      }

      try {
        const files = req.files || [req.file];
        
        for (const file of files) {
          if (!file || !file.buffer) continue;

          // 大小检查
          if (file.size > maxSize) {
            return res.status(400).json({
              error: `文件过大: ${file.originalname}，最大允许 ${Math.round(maxSize / 1024 / 1024)}MB`
            });
          }

          // 文件类型验证
          const validation = await this.validateFileType(
            file.buffer,
            file.mimetype,
            file.originalname
          );

          if (!validation.valid) {
            return res.status(400).json({
              error: `文件验证失败: ${file.originalname}`,
              reason: validation.reason,
              details: validation
            });
          }

          // 将验证结果附加到文件对象
          file.validation = validation;
        }

        next();

      } catch (error) {
        console.error('文件验证中间件错误:', error);
        res.status(500).json({
          error: '文件验证失败',
          message: error.message
        });
      }
    };
  }
}

module.exports = FileTypeValidator;