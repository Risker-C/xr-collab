function getRealIP(req) {
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

/**
 * Rate Limiting Middleware
 * API速率限制中间件
 * 
 * 防止API滥用和DDoS攻击
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000 // 默认1分钟窗口
    this.maxRequests = options.maxRequests || 100 // 默认100次请求
    this.message = options.message || '请求过于频繁，请稍后再试'
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false
    this.skipFailedRequests = options.skipFailedRequests || false
    
    // 存储请求记录 {ip: {count: number, resetTime: number}}
    this.requests = new Map()
    
    // 定期清理过期记录
    setInterval(() => this.cleanup(), this.windowMs)
  }

  middleware() {
    return (req, res, next) => {
      const key = this.getKey(req)
      const now = Date.now()
      
      let record = this.requests.get(key)
      
      // 如果记录不存在或已过期，创建新记录
      if (!record || now > record.resetTime) {
        record = {
          count: 0,
          resetTime: now + this.windowMs
        }
        this.requests.set(key, record)
      }
      
      // 增加计数
      record.count++
      
      // 设置响应头
      res.setHeader('X-RateLimit-Limit', this.maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - record.count))
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
      
      // 检查是否超过限制
      if (record.count > this.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000)
        res.setHeader('Retry-After', retryAfter)
        
        return res.status(429).json({
          error: this.message,
          retryAfter: retryAfter
        })
      }
      
      // 如果配置了跳过成功/失败请求，在响应后调整计数
      if (this.skipSuccessfulRequests || this.skipFailedRequests) {
        const originalSend = res.send
        res.send = function(data) {
          const statusCode = res.statusCode
          
          if (
            (this.skipSuccessfulRequests && statusCode < 400) ||
            (this.skipFailedRequests && statusCode >= 400)
          ) {
            record.count--
          }
          
          return originalSend.call(this, data)
        }.bind(this)
      }
      
      next()
    }
  }

  /**
   * 获取限流key（默认使用IP地址）
   */
  getKey(req) {
    return getRealIP(req)
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now()
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * 重置特定key的限制
   */
  reset(key) {
    this.requests.delete(key)
  }

  /**
   * 重置所有限制
   */
  resetAll() {
    this.requests.clear()
  }
}

/**
 * 创建速率限制中间件
 */
function createRateLimiter(options) {
  const limiter = new RateLimiter(options)
  return limiter.middleware()
}

/**
 * 预设配置
 */
const presets = {
  // 严格限制（用于敏感操作）
  strict: createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 10,      // 10次请求
    message: '操作过于频繁，请1分钟后再试'
  }),
  
  // 标准限制（用于一般API）
  standard: createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 60,      // 60次请求
    message: '请求过于频繁，请稍后再试'
  }),
  
  // 宽松限制（用于公开API）
  relaxed: createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 120,     // 120次请求
    message: '请求过于频繁，请稍后再试'
  }),
  
  // 文件上传限制
  upload: createRateLimiter({
    windowMs: 300000,     // 5分钟
    maxRequests: 20,      // 20次上传
    message: '上传过于频繁，请5分钟后再试'
  }),
  
  // 3D生成限制（资源密集型操作）
  generation: createRateLimiter({
    windowMs: 600000,     // 10分钟
    maxRequests: 10,      // 10次生成
    message: '生成请求过于频繁，请10分钟后再试'
  })
}

module.exports = {
  RateLimiter,
  createRateLimiter,
  presets
}
