-- Migration: Create device_profiles table
-- Version: 001
-- Description: Device capability profiles with 4-tier grading system

CREATE TABLE IF NOT EXISTS device_profiles (
    id SERIAL PRIMARY KEY,
    device_fingerprint VARCHAR(64) UNIQUE NOT NULL,
    device_model VARCHAR(255),
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    
    -- Hardware Capabilities
    cpu_cores INTEGER,
    cpu_frequency DECIMAL(10, 2),
    gpu_model VARCHAR(255),
    ram_mb INTEGER,
    
    -- Sensors
    has_gyroscope BOOLEAN DEFAULT FALSE,
    has_accelerometer BOOLEAN DEFAULT FALSE,
    has_magnetometer BOOLEAN DEFAULT FALSE,
    has_arkit BOOLEAN DEFAULT FALSE,
    has_arcore BOOLEAN DEFAULT FALSE,
    
    -- Grading Results
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('premium', 'high', 'medium', 'low')),
    tier_score INTEGER NOT NULL CHECK (tier_score >= 0 AND tier_score <= 100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_device_fingerprint ON device_profiles(device_fingerprint);
CREATE INDEX idx_tier ON device_profiles(tier);
CREATE INDEX idx_created_at ON device_profiles(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_profiles_updated_at 
    BEFORE UPDATE ON device_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE device_profiles IS 'Stores device capability profiles and tier classifications';
COMMENT ON COLUMN device_profiles.device_fingerprint IS 'Unique device identifier hash';
COMMENT ON COLUMN device_profiles.tier IS 'Device tier: premium, high, medium, low';
COMMENT ON COLUMN device_profiles.tier_score IS 'Numeric score 0-100 for tier calculation';
