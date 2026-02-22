/**
 * Device Tier Grading Algorithm
 * 
 * Classifies devices into 4 tiers based on hardware capabilities:
 * - Premium (80-100): Flagship devices with AR support
 * - High (60-79): High-end devices with good performance
 * - Medium (40-59): Mid-range devices with basic capabilities
 * - Low (0-39): Entry-level devices with limited capabilities
 */

class DeviceGradingService {
  /**
   * Calculate device tier and score
   * @param {Object} capabilities - Device capability data
   * @returns {Object} { tier, score }
   */
  static gradeDevice(capabilities) {
    const score = this.calculateScore(capabilities);
    const tier = this.determineTier(score);
    
    return { tier, score };
  }

  /**
   * Calculate numeric score (0-100) based on capabilities
   */
  static calculateScore(capabilities) {
    let score = 0;

    // CPU Score (0-25 points)
    score += this.scoreCPU(capabilities.cpu_cores, capabilities.cpu_frequency);

    // RAM Score (0-20 points)
    score += this.scoreRAM(capabilities.ram_mb);

    // GPU Score (0-20 points)
    score += this.scoreGPU(capabilities.gpu_model);

    // Sensor Score (0-20 points)
    score += this.scoreSensors(capabilities);

    // AR Support Score (0-15 points)
    score += this.scoreARSupport(capabilities);

    return Math.min(100, Math.round(score));
  }

  /**
   * Score CPU (0-25 points)
   */
  static scoreCPU(cores, frequency) {
    let cpuScore = 0;

    // Core count scoring (0-15 points)
    if (cores >= 8) cpuScore += 15;
    else if (cores >= 6) cpuScore += 12;
    else if (cores >= 4) cpuScore += 9;
    else if (cores >= 2) cpuScore += 5;
    else cpuScore += 2;

    // Frequency scoring (0-10 points)
    if (frequency >= 3.0) cpuScore += 10;
    else if (frequency >= 2.5) cpuScore += 8;
    else if (frequency >= 2.0) cpuScore += 6;
    else if (frequency >= 1.5) cpuScore += 4;
    else cpuScore += 2;

    return cpuScore;
  }

  /**
   * Score RAM (0-20 points)
   */
  static scoreRAM(ramMB) {
    if (ramMB >= 12288) return 20;      // 12GB+
    if (ramMB >= 8192) return 17;       // 8GB+
    if (ramMB >= 6144) return 14;       // 6GB+
    if (ramMB >= 4096) return 11;       // 4GB+
    if (ramMB >= 3072) return 8;        // 3GB+
    if (ramMB >= 2048) return 5;        // 2GB+
    return 2;                            // <2GB
  }

  /**
   * Score GPU (0-20 points)
   */
  static scoreGPU(gpuModel) {
    if (!gpuModel) return 5;

    const gpu = gpuModel.toLowerCase();

    // Premium GPUs
    if (gpu.includes('adreno 7') || 
        gpu.includes('apple a17') || 
        gpu.includes('apple a16') ||
        gpu.includes('apple a15') ||
        gpu.includes('mali-g78') ||
        gpu.includes('mali-g710')) {
      return 20;
    }

    // High-end GPUs
    if (gpu.includes('adreno 6') || 
        gpu.includes('apple a14') ||
        gpu.includes('apple a13') ||
        gpu.includes('mali-g77') ||
        gpu.includes('mali-g76')) {
      return 15;
    }

    // Mid-range GPUs
    if (gpu.includes('adreno 5') || 
        gpu.includes('apple a12') ||
        gpu.includes('mali-g72') ||
        gpu.includes('mali-g71')) {
      return 10;
    }

    // Entry-level GPUs
    return 5;
  }

  /**
   * Score Sensors (0-20 points)
   */
  static scoreSensors(capabilities) {
    let sensorScore = 0;

    if (capabilities.has_gyroscope) sensorScore += 6;
    if (capabilities.has_accelerometer) sensorScore += 6;
    if (capabilities.has_magnetometer) sensorScore += 4;
    
    // Bonus points for having all three
    if (capabilities.has_gyroscope && 
        capabilities.has_accelerometer && 
        capabilities.has_magnetometer) {
      sensorScore += 4;
    }

    return sensorScore;
  }

  /**
   * Score AR Support (0-15 points)
   */
  static scoreARSupport(capabilities) {
    let arScore = 0;

    if (capabilities.has_arkit) arScore += 8;
    if (capabilities.has_arcore) arScore += 7;

    return arScore;
  }

  /**
   * Determine tier from score
   */
  static determineTier(score) {
    if (score >= 80) return 'premium';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get tier recommendations
   */
  static getTierRecommendations(tier) {
    const recommendations = {
      premium: {
        maxQuality: '4K',
        recommendedQuality: '1440p',
        maxFPS: 60,
        features: ['full_ar', 'high_poly_models', 'real_time_shadows', 'post_processing']
      },
      high: {
        maxQuality: '1440p',
        recommendedQuality: '1080p',
        maxFPS: 60,
        features: ['full_ar', 'medium_poly_models', 'basic_shadows']
      },
      medium: {
        maxQuality: '1080p',
        recommendedQuality: '720p',
        maxFPS: 30,
        features: ['basic_ar', 'low_poly_models', 'no_shadows']
      },
      low: {
        maxQuality: '720p',
        recommendedQuality: '480p',
        maxFPS: 30,
        features: ['no_ar', 'minimal_poly_models', 'no_effects']
      }
    };

    return recommendations[tier] || recommendations.low;
  }
}

module.exports = DeviceGradingService;
