const pool = require('../config/database');

class DeviceProfileRepository {
  /**
   * Find device profile by fingerprint
   */
  static async findByFingerprint(fingerprint) {
    const query = `
      SELECT * FROM device_profiles 
      WHERE device_fingerprint = $1
    `;
    
    const result = await pool.query(query, [fingerprint]);
    return result.rows[0] || null;
  }

  /**
   * Create new device profile
   */
  static async create(profileData) {
    const query = `
      INSERT INTO device_profiles (
        device_fingerprint, device_model, os_name, os_version,
        cpu_cores, cpu_frequency, gpu_model, ram_mb,
        has_gyroscope, has_accelerometer, has_magnetometer,
        has_arkit, has_arcore, tier, tier_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      profileData.device_fingerprint,
      profileData.device_model,
      profileData.os_name,
      profileData.os_version,
      profileData.cpu_cores,
      profileData.cpu_frequency,
      profileData.gpu_model,
      profileData.ram_mb,
      profileData.has_gyroscope,
      profileData.has_accelerometer,
      profileData.has_magnetometer,
      profileData.has_arkit,
      profileData.has_arcore,
      profileData.tier,
      profileData.tier_score
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update existing device profile
   */
  static async update(fingerprint, profileData) {
    const query = `
      UPDATE device_profiles SET
        device_model = $2,
        os_name = $3,
        os_version = $4,
        cpu_cores = $5,
        cpu_frequency = $6,
        gpu_model = $7,
        ram_mb = $8,
        has_gyroscope = $9,
        has_accelerometer = $10,
        has_magnetometer = $11,
        has_arkit = $12,
        has_arcore = $13,
        tier = $14,
        tier_score = $15,
        last_seen_at = CURRENT_TIMESTAMP
      WHERE device_fingerprint = $1
      RETURNING *
    `;
    
    const values = [
      fingerprint,
      profileData.device_model,
      profileData.os_name,
      profileData.os_version,
      profileData.cpu_cores,
      profileData.cpu_frequency,
      profileData.gpu_model,
      profileData.ram_mb,
      profileData.has_gyroscope,
      profileData.has_accelerometer,
      profileData.has_magnetometer,
      profileData.has_arkit,
      profileData.has_arcore,
      profileData.tier,
      profileData.tier_score
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get statistics by tier
   */
  static async getStatsByTier() {
    const query = `
      SELECT tier, COUNT(*) as count
      FROM device_profiles
      GROUP BY tier
      ORDER BY 
        CASE tier
          WHEN 'premium' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = DeviceProfileRepository;
