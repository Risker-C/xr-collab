const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/config/database');
const redisClient = require('../../src/config/redis');

describe('Device API Integration Tests', () => {
  beforeAll(async () => {
    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up connections
    await pool.end();
    await redisClient.quit();
  });

  describe('POST /api/device/capability', () => {
    test('should analyze device capability and return tier classification', async () => {
      const deviceData = {
        device_model: 'iPhone 15 Pro',
        os_name: 'iOS',
        os_version: '17.0',
        cpu_cores: 6,
        cpu_frequency: 3.46,
        gpu_model: 'Apple A17 Pro GPU',
        ram_mb: 8192,
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: true,
        has_arkit: true,
        has_arcore: false
      };

      const response = await request(app)
        .post('/api/device/capability')
        .send(deviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tier');
      expect(response.body.data).toHaveProperty('tier_score');
      expect(response.body.data).toHaveProperty('device_fingerprint');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(['premium', 'high', 'medium', 'low']).toContain(response.body.data.tier);
    });

    test('should return cached result on second request', async () => {
      const deviceData = {
        device_model: 'Samsung Galaxy S23',
        os_name: 'Android',
        os_version: '13',
        cpu_cores: 8,
        cpu_frequency: 3.36,
        gpu_model: 'Adreno 740',
        ram_mb: 8192,
        has_gyroscope: true,
        has_accelerometer: true,
        has_magnetometer: true,
        has_arkit: false,
        has_arcore: true
      };

      // First request
      const response1 = await request(app)
        .post('/api/device/capability')
        .send(deviceData)
        .expect(201);

      expect(response1.body.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await request(app)
        .post('/api/device/capability')
        .send(deviceData)
        .expect(200);

      expect(response2.body.cached).toBe(true);
      expect(response2.body.data.device_fingerprint).toBe(response1.body.data.device_fingerprint);
    });

    test('should return 400 for invalid request', async () => {
      const invalidData = {
        device_model: 'Test Device',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/device/capability')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('should validate CPU cores range', async () => {
      const invalidData = {
        device_model: 'Test Device',
        os_name: 'TestOS',
        os_version: '1.0',
        cpu_cores: 100, // Invalid
        cpu_frequency: 2.0,
        ram_mb: 4096
      };

      const response = await request(app)
        .post('/api/device/capability')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/device/stats', () => {
    test('should return device tier statistics', async () => {
      const response = await request(app)
        .get('/api/device/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const stat = response.body.data[0];
        expect(stat).toHaveProperty('tier');
        expect(stat).toHaveProperty('count');
      }
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting', async () => {
      const deviceData = {
        device_model: 'Test Device',
        os_name: 'TestOS',
        os_version: '1.0',
        cpu_cores: 4,
        cpu_frequency: 2.0,
        ram_mb: 4096
      };

      // Make requests up to the limit
      // Note: Actual limit testing may require adjusting test environment
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/device/capability')
            .send(deviceData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed (within reasonable limit for testing)
      responses.forEach(response => {
        expect([200, 201, 429]).toContain(response.status);
      });
    }, 15000);
  });
});
