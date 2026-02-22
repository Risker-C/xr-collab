const DeviceGradingService = require('../../src/services/deviceGradingService');

describe('DeviceGradingService', () => {
  describe('gradeDevice', () => {
    test('should grade premium device correctly', () => {
      const capabilities = {
        cpu_cores: 8,
        cpu_frequency: 3.2,
        gpu_model: 'Apple A17 Pro GPU',
        ram_mb: 12288,
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: true,
        has_arkit: true,
        has_arcore: false
      };

      const result = DeviceGradingService.gradeDevice(capabilities);

      expect(result.tier).toBe('premium');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should grade high-end device correctly', () => {
      const capabilities = {
        cpu_cores: 6,
        cpu_frequency: 2.5,
        gpu_model: 'Adreno 650',
        ram_mb: 8192,
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: true,
        has_arkit: false,
        has_arcore: true
      };

      const result = DeviceGradingService.gradeDevice(capabilities);

      expect(result.tier).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
    });

    test('should grade medium device correctly', () => {
      const capabilities = {
        cpu_cores: 4,
        cpu_frequency: 2.0,
        gpu_model: 'Adreno 530',
        ram_mb: 4096,
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: false,
        has_arkit: false,
        has_arcore: false
      };

      const result = DeviceGradingService.gradeDevice(capabilities);

      expect(result.tier).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
    });

    test('should grade low-end device correctly', () => {
      const capabilities = {
        cpu_cores: 2,
        cpu_frequency: 1.5,
        gpu_model: 'Mali-G52',
        ram_mb: 2048,
        has_gyroscope: false,
        has_accelerometer: true,
        has_magnetometer: false,
        has_arkit: false,
        has_arcore: false
      };

      const result = DeviceGradingService.gradeDevice(capabilities);

      expect(result.tier).toBe('low');
      expect(result.score).toBeLessThan(40);
    });
  });

  describe('scoreCPU', () => {
    test('should give maximum score for 8+ cores and 3.0+ GHz', () => {
      const score = DeviceGradingService.scoreCPU(8, 3.2);
      expect(score).toBe(25);
    });

    test('should give lower score for fewer cores', () => {
      const score = DeviceGradingService.scoreCPU(4, 2.0);
      expect(score).toBeLessThan(25);
    });
  });

  describe('scoreRAM', () => {
    test('should give maximum score for 12GB+ RAM', () => {
      const score = DeviceGradingService.scoreRAM(12288);
      expect(score).toBe(20);
    });

    test('should give minimum score for <2GB RAM', () => {
      const score = DeviceGradingService.scoreRAM(1024);
      expect(score).toBe(2);
    });
  });

  describe('scoreGPU', () => {
    test('should recognize Apple A17 as premium GPU', () => {
      const score = DeviceGradingService.scoreGPU('Apple A17 Pro GPU');
      expect(score).toBe(20);
    });

    test('should recognize Adreno 6xx as high-end GPU', () => {
      const score = DeviceGradingService.scoreGPU('Adreno 650');
      expect(score).toBe(15);
    });

    test('should handle unknown GPU gracefully', () => {
      const score = DeviceGradingService.scoreGPU('Unknown GPU');
      expect(score).toBe(5);
    });
  });

  describe('scoreSensors', () => {
    test('should give bonus for having all sensors', () => {
      const capabilities = {
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: true
      };
      
      const score = DeviceGradingService.scoreSensors(capabilities);
      expect(score).toBe(20); // 6 + 6 + 4 + 4 bonus
    });

    test('should give no bonus without all sensors', () => {
      const capabilities = {
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: false
      };
      
      const score = DeviceGradingService.scoreSensors(capabilities);
      expect(score).toBe(12); // 6 + 6, no bonus
    });
  });

  describe('scoreARSupport', () => {
    test('should score ARKit correctly', () => {
      const score = DeviceGradingService.scoreARSupport({ has_arkit: true, has_arcore: false });
      expect(score).toBe(8);
    });

    test('should score ARCore correctly', () => {
      const score = DeviceGradingService.scoreARSupport({ has_arkit: false, has_arcore: true });
      expect(score).toBe(7);
    });

    test('should score both AR platforms', () => {
      const score = DeviceGradingService.scoreARSupport({ has_arkit: true, has_arcore: true });
      expect(score).toBe(15);
    });
  });

  describe('getTierRecommendations', () => {
    test('should provide premium tier recommendations', () => {
      const recommendations = DeviceGradingService.getTierRecommendations('premium');
      
      expect(recommendations.maxQuality).toBe('4K');
      expect(recommendations.maxFPS).toBe(60);
      expect(recommendations.features).toContain('full_ar');
    });

    test('should provide low tier recommendations', () => {
      const recommendations = DeviceGradingService.getTierRecommendations('low');
      
      expect(recommendations.maxQuality).toBe('720p');
      expect(recommendations.maxFPS).toBe(30);
      expect(recommendations.features).toContain('no_ar');
    });
  });
});
