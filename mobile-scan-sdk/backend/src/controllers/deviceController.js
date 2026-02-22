const crypto = require('crypto');
const DeviceGradingService = require('../services/deviceGradingService');
const DeviceProfileRepository = require('../repositories/deviceProfileRepository');
const CacheService = require('../services/cacheService');

class DeviceController {
  /**
   * POST /api/device/capability
   * Analyze device capabilities and return tier classification
   */
  static async analyzeCapability(req, res) {
    try {
      const capabilities = req.body;
      
      // Generate device fingerprint
      const fingerprint = DeviceController.generateFingerprint(capabilities);
      
      // Check cache first
      let profile = await CacheService.getDeviceProfile(fingerprint);
      
      if (profile) {
        return res.json({
          success: true,
          cached: true,
          data: profile
        });
      }
      
      // Check database
      profile = await DeviceProfileRepository.findByFingerprint(fingerprint);
      
      if (profile) {
        // Update cache
        await CacheService.setDeviceProfile(fingerprint, profile);
        
        return res.json({
          success: true,
          cached: false,
          data: profile
        });
      }
      
      // Grade device
      const { tier, score } = DeviceGradingService.gradeDevice(capabilities);
      const recommendations = DeviceGradingService.getTierRecommendations(tier);
      
      // Prepare profile data
      const profileData = {
        device_fingerprint: fingerprint,
        device_model: capabilities.device_model,
        os_name: capabilities.os_name,
        os_version: capabilities.os_version,
        cpu_cores: capabilities.cpu_cores,
        cpu_frequency: capabilities.cpu_frequency,
        gpu_model: capabilities.gpu_model,
        ram_mb: capabilities.ram_mb,
        has_gyroscope: capabilities.has_gyroscope || false,
        has_accelerometer: capabilities.has_accelerometer || false,
        has_magnetometer: capabilities.has_magnetometer || false,
        has_arkit: capabilities.has_arkit || false,
        has_arcore: capabilities.has_arcore || false,
        tier,
        tier_score: score
      };
      
      // Save to database
      profile = await DeviceProfileRepository.create(profileData);
      
      // Add recommendations
      const response = {
        ...profile,
        recommendations
      };
      
      // Cache the result
      await CacheService.setDeviceProfile(fingerprint, response);
      
      res.status(201).json({
        success: true,
        cached: false,
        data: response
      });
      
    } catch (error) {
      console.error('Device capability analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * GET /api/device/stats
   * Get device tier statistics
   */
  static async getStats(req, res) {
    try {
      // Check cache
      let stats = await CacheService.getTierStats();
      
      if (!stats) {
        // Get from database
        stats = await DeviceProfileRepository.getStatsByTier();
        
        // Cache the result
        await CacheService.setTierStats(stats);
      }
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Stats retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Generate device fingerprint from capabilities
   */
  static generateFingerprint(capabilities) {
    const fingerprintData = [
      capabilities.device_model,
      capabilities.os_name,
      capabilities.os_version,
      capabilities.cpu_cores,
      capabilities.gpu_model,
      capabilities.ram_mb
    ].join('|');
    
    return crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex');
  }
}

module.exports = DeviceController;
