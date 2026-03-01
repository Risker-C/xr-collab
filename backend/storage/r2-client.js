/**
 * Cloudflare R2 Client
 * 用于大文件存储，替代内存文件处理
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class R2Client {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    this.bucketName = process.env.R2_BUCKET_NAME;
  }

  /**
   * 上传文件（支持流式上传）
   */
  async uploadFile(key, body, options = {}) {
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: options.contentType || 'application/octet-stream',
          Metadata: options.metadata || {},
          ...options.params
        }
      });

      // 监听上传进度
      if (options.onProgress) {
        upload.on('httpUploadProgress', options.onProgress);
      }

      const result = await upload.done();
      
      return {
        success: true,
        key: key,
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket
      };
    } catch (error) {
      console.error('R2 upload failed:', error);
      throw error;
    }
  }

  /**
   * 上传用户文件
   */
  async uploadUserFile(roomId, fileId, filename, body, options = {}) {
    const key = `uploads/${roomId}/${fileId}/${filename}`;
    return await this.uploadFile(key, body, options);
  }

  /**
   * 上传缩略图
   */
  async uploadThumbnail(roomId, fileId, body, format = 'webp') {
    const key = `thumbnails/${roomId}/${fileId}/thumb.${format}`;
    return await this.uploadFile(key, body, {
      contentType: `image/${format}`,
      ...options
    });
  }

  /**
   * 上传3D模型
   */
  async uploadModel(taskId, filename, body, options = {}) {
    const key = `models/${taskId}/${filename}`;
    return await this.uploadFile(key, body, {
      contentType: 'model/gltf-binary',
      ...options
    });
  }

  /**
   * 上传点云数据
   */
  async uploadPointCloud(scanId, filename, body, options = {}) {
    const key = `pointclouds/${scanId}/${filename}`;
    return await this.uploadFile(key, body, {
      contentType: 'application/octet-stream',
      ...options
    });
  }

  /**
   * 获取文件（返回流）
   */
  async getFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.client.send(command);
      return {
        success: true,
        body: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return { success: false, error: 'File not found' };
      }
      console.error('R2 get file failed:', error);
      throw error;
    }
  }

  /**
   * 获取文件信息（不下载内容）
   */
  async getFileInfo(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.client.send(command);
      return {
        success: true,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        etag: response.ETag
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return { success: false, error: 'File not found' };
      }
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      console.error('R2 delete failed:', error);
      throw error;
    }
  }

  /**
   * 生成预签名URL（用于直接访问）
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return { success: true, url };
    } catch (error) {
      console.error('R2 signed URL failed:', error);
      throw error;
    }
  }

  /**
   * 生成公开访问URL
   */
  getPublicUrl(key) {
    // 如果配置了公开域名
    if (process.env.R2_PUBLIC_URL) {
      return `${process.env.R2_PUBLIC_URL}/${key}`;
    }
    
    // 使用默认R2域名（需要配置公开访问）
    const accountId = process.env.R2_ACCOUNT_ID;
    return `https://pub-${accountId}.r2.dev/${key}`;
  }

  /**
   * 流式读取大文件（分块）
   */
  async streamFile(key, chunkSize = 1024 * 1024) {
    const fileInfo = await this.getFileInfo(key);
    if (!fileInfo.success) {
      throw new Error('File not found');
    }

    const totalSize = fileInfo.contentLength;
    const chunks = [];
    
    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalSize - 1);
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Range: `bytes=${start}-${end}`
      });

      const response = await this.client.send(command);
      const chunk = await this.streamToBuffer(response.Body);
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * 辅助函数：将流转换为Buffer
   */
  async streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 尝试列出bucket（权限检查）
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: 'health-check-dummy'
      });

      // 这个调用会返回404，但证明连接正常
      await this.client.send(command);
      return { success: true, status: 'connected' };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        // 404是预期的，说明连接正常
        return { success: true, status: 'connected' };
      }
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new R2Client();
    }
    return instance;
  },
  R2Client
};