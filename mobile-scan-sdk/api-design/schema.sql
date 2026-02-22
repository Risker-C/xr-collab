-- XR Collab Mobile Scan SDK - Database Schema
-- Version: 1.0.0
-- Date: 2026-02-22

-- ============================================================================
-- Device Profiles Table
-- Stores device capability information for analytics and optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    device_id VARCHAR(255) NOT NULL,
    
    -- Device Information
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('iOS', 'Android', 'Windows', 'macOS')),
    os_version VARCHAR(50) NOT NULL,
    device_model VARCHAR(255) NOT NULL,
    
    -- Hardware Specifications
    cpu_cores INT NOT NULL,
    cpu_frequency INT NOT NULL COMMENT 'MHz',
    gpu_model VARCHAR(255),
    ram_mb INT NOT NULL COMMENT 'RAM in megabytes',
    
    -- Display Specifications
    screen_width INT NOT NULL,
    screen_height INT NOT NULL,
    screen_density INT NOT NULL COMMENT 'DPI',
    
    -- Capability Assessment
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('Low', 'Medium', 'High', 'Ultra')),
    capability_score INT NOT NULL CHECK (capability_score BETWEEN 0 AND 100),
    
    -- Capabilities JSON
    max_model_complexity INT NOT NULL COMMENT 'Maximum polygon count',
    max_texture_size INT NOT NULL COMMENT 'Maximum texture resolution',
    recommended_lod INT NOT NULL CHECK (recommended_lod BETWEEN 0 AND 3),
    supported_formats JSON NOT NULL COMMENT 'Array of supported 3D formats',
    max_concurrent_models INT NOT NULL,
    realtime_collaboration BOOLEAN NOT NULL DEFAULT TRUE,
    advanced_shaders BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Features
    supported_features JSON COMMENT 'Array of AR/graphics features',
    
    -- Performance Metrics
    battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
    thermal_state VARCHAR(20) CHECK (thermal_state IN ('nominal', 'fair', 'serious', 'critical')),
    
    -- Recommendations JSON
    recommendations JSON COMMENT 'Rendering recommendations',
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usage_count INT NOT NULL DEFAULT 1,
    
    -- Indexes
    INDEX idx_device_id (device_id),
    INDEX idx_tier (tier),
    INDEX idx_platform (platform),
    INDEX idx_created_at (created_at),
    INDEX idx_capability_score (capability_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Device capability profiles for mobile optimization';

-- ============================================================================
-- Models Table (Extended)
-- Enhanced with multi-LOD support
-- ============================================================================

CREATE TABLE IF NOT EXISTS models (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Original Model Information
    original_format VARCHAR(50) NOT NULL,
    original_vertices INT NOT NULL,
    original_triangles INT NOT NULL,
    original_file_size BIGINT NOT NULL COMMENT 'Bytes',
    
    -- Bounding Box
    bbox_min_x FLOAT NOT NULL,
    bbox_min_y FLOAT NOT NULL,
    bbox_min_z FLOAT NOT NULL,
    bbox_max_x FLOAT NOT NULL,
    bbox_max_y FLOAT NOT NULL,
    bbox_max_z FLOAT NOT NULL,
    
    -- Model Metadata
    materials_count INT NOT NULL DEFAULT 0,
    animations_count INT NOT NULL DEFAULT 0,
    has_textures BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Storage
    storage_path VARCHAR(512) NOT NULL,
    cdn_base_url VARCHAR(512),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    processing_error TEXT,
    
    -- Ownership
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX idx_name_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='3D models with multi-LOD support';

-- ============================================================================
-- Model LODs Table
-- Stores different Level of Detail versions of models
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_lods (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    model_id VARCHAR(36) NOT NULL,
    lod_level INT NOT NULL CHECK (lod_level BETWEEN 0 AND 3),
    
    -- LOD Specifications
    format VARCHAR(50) NOT NULL CHECK (format IN ('glTF', 'USDZ', 'FBX')),
    vertices INT NOT NULL,
    triangles INT NOT NULL,
    texture_size INT NOT NULL COMMENT 'Texture resolution',
    file_size BIGINT NOT NULL COMMENT 'Bytes',
    
    -- Storage
    storage_path VARCHAR(512) NOT NULL,
    cdn_url VARCHAR(512),
    
    -- Cache Control
    etag VARCHAR(64) NOT NULL,
    cache_control VARCHAR(255) DEFAULT 'public, max-age=86400',
    
    -- Processing
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generation_time_ms INT COMMENT 'Time taken to generate this LOD',
    
    -- Statistics
    download_count BIGINT NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY unique_model_lod_format (model_id, lod_level, format),
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_model_id (model_id),
    INDEX idx_lod_level (lod_level),
    INDEX idx_format (format),
    INDEX idx_download_count (download_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Level of Detail variants for 3D models';

-- ============================================================================
-- Upload Sessions Table
-- Tracks chunked upload sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    upload_id VARCHAR(64) NOT NULL UNIQUE,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL COMMENT 'Total file size in bytes',
    mime_type VARCHAR(100) NOT NULL,
    
    -- Chunking Configuration
    chunk_size INT NOT NULL COMMENT 'Size of each chunk in bytes',
    total_chunks INT NOT NULL,
    uploaded_chunks INT NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSON COMMENT 'Custom metadata from client',
    
    -- Checksum
    final_checksum VARCHAR(64) COMMENT 'MD5 checksum of complete file',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'uploading' 
        CHECK (status IN ('uploading', 'completed', 'failed', 'expired')),
    error_message TEXT,
    
    -- Ownership
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255),
    
    -- Storage
    storage_path VARCHAR(512) COMMENT 'Final storage path after completion',
    capture_id VARCHAR(36) COMMENT 'Created capture ID after completion',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_upload_id (upload_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chunked upload session tracking';

-- ============================================================================
-- Upload Chunks Table
-- Tracks individual uploaded chunks
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_chunks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    upload_id VARCHAR(64) NOT NULL,
    chunk_index INT NOT NULL,
    
    -- Chunk Information
    chunk_size INT NOT NULL COMMENT 'Actual size of this chunk',
    checksum VARCHAR(64) COMMENT 'MD5 checksum for integrity',
    
    -- Storage
    storage_path VARCHAR(512) NOT NULL,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'received' 
        CHECK (status IN ('received', 'verified', 'failed')),
    
    -- Timestamps
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY unique_upload_chunk (upload_id, chunk_index),
    FOREIGN KEY fk_upload_session (upload_id) 
        REFERENCES upload_sessions(upload_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_upload_id (upload_id),
    INDEX idx_chunk_index (chunk_index),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual chunk tracking for uploads';

-- ============================================================================
-- Analytics Tables
-- ============================================================================

-- Device Analytics
CREATE TABLE IF NOT EXISTS device_analytics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(255) NOT NULL,
    profile_id VARCHAR(36),
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    
    -- Session
    session_id VARCHAR(64),
    
    -- Performance Metrics
    fps FLOAT COMMENT 'Frames per second',
    memory_usage_mb INT,
    battery_drain_percent FLOAT,
    network_latency_ms INT,
    
    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_device_id (device_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Device performance and usage analytics';

-- ============================================================================
-- Stored Procedures
-- ============================================================================

DELIMITER $$

-- Update device profile or create new one
CREATE PROCEDURE upsert_device_profile(
    IN p_device_id VARCHAR(255),
    IN p_platform VARCHAR(50),
    IN p_os_version VARCHAR(50),
    IN p_device_model VARCHAR(255),
    IN p_cpu_cores INT,
    IN p_cpu_frequency INT,
    IN p_gpu_model VARCHAR(255),
    IN p_ram_mb INT,
    IN p_screen_width INT,
    IN p_screen_height INT,
    IN p_screen_density INT,
    IN p_tier VARCHAR(20),
    IN p_capability_score INT,
    IN p_max_model_complexity INT,
    IN p_max_texture_size INT,
    IN p_recommended_lod INT,
    IN p_supported_formats JSON,
    IN p_max_concurrent_models INT,
    IN p_realtime_collaboration BOOLEAN,
    IN p_advanced_shaders BOOLEAN,
    IN p_supported_features JSON,
    IN p_battery_level INT,
    IN p_thermal_state VARCHAR(20),
    IN p_recommendations JSON,
    OUT p_profile_id VARCHAR(36)
)
BEGIN
    DECLARE existing_id VARCHAR(36);
    
    -- Check if profile exists
    SELECT id INTO existing_id 
    FROM device_profiles 
    WHERE device_id = p_device_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF existing_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE device_profiles 
        SET 
            platform = p_platform,
            os_version = p_os_version,
            device_model = p_device_model,
            cpu_cores = p_cpu_cores,
            cpu_frequency = p_cpu_frequency,
            gpu_model = p_gpu_model,
            ram_mb = p_ram_mb,
            screen_width = p_screen_width,
            screen_height = p_screen_height,
            screen_density = p_screen_density,
            tier = p_tier,
            capability_score = p_capability_score,
            max_model_complexity = p_max_model_complexity,
            max_texture_size = p_max_texture_size,
            recommended_lod = p_recommended_lod,
            supported_formats = p_supported_formats,
            max_concurrent_models = p_max_concurrent_models,
            realtime_collaboration = p_realtime_collaboration,
            advanced_shaders = p_advanced_shaders,
            supported_features = p_supported_features,
            battery_level = p_battery_level,
            thermal_state = p_thermal_state,
            recommendations = p_recommendations,
            last_seen_at = CURRENT_TIMESTAMP,
            usage_count = usage_count + 1
        WHERE id = existing_id;
        
        SET p_profile_id = existing_id;
    ELSE
        -- Insert new profile
        SET p_profile_id = UUID();
        
        INSERT INTO device_profiles (
            id, device_id, platform, os_version, device_model,
            cpu_cores, cpu_frequency, gpu_model, ram_mb,
            screen_width, screen_height, screen_density,
            tier, capability_score, max_model_complexity,
            max_texture_size, recommended_lod, supported_formats,
            max_concurrent_models, realtime_collaboration, advanced_shaders,
            supported_features, battery_level, thermal_state, recommendations
        ) VALUES (
            p_profile_id, p_device_id, p_platform, p_os_version, p_device_model,
            p_cpu_cores, p_cpu_frequency, p_gpu_model, p_ram_mb,
            p_screen_width, p_screen_height, p_screen_density,
            p_tier, p_capability_score, p_max_model_complexity,
            p_max_texture_size, p_recommended_lod, p_supported_formats,
            p_max_concurrent_models, p_realtime_collaboration, p_advanced_shaders,
            p_supported_features, p_battery_level, p_thermal_state, p_recommendations
        );
    END IF;
END$$

-- Clean up expired upload sessions
CREATE PROCEDURE cleanup_expired_uploads()
BEGIN
    -- Delete chunks for expired sessions
    DELETE uc FROM upload_chunks uc
    INNER JOIN upload_sessions us ON uc.upload_id = us.upload_id
    WHERE us.expires_at < CURRENT_TIMESTAMP;
    
    -- Update session status
    UPDATE upload_sessions 
    SET status = 'expired'
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND status = 'uploading';
END$$

DELIMITER ;

-- ============================================================================
-- Views
-- ============================================================================

-- Device tier distribution
CREATE OR REPLACE VIEW v_device_tier_stats AS
SELECT 
    tier,
    COUNT(*) as device_count,
    AVG(capability_score) as avg_score,
    AVG(ram_mb) as avg_ram_mb,
    COUNT(DISTINCT platform) as platform_count
FROM device_profiles
GROUP BY tier;

-- Model LOD statistics
CREATE OR REPLACE VIEW v_model_lod_stats AS
SELECT 
    m.id as model_id,
    m.name as model_name,
    COUNT(DISTINCT ml.lod_level) as available_lods,
    SUM(ml.download_count) as total_downloads,
    AVG(ml.file_size) as avg_lod_size
FROM models m
LEFT JOIN model_lods ml ON m.id = ml.model_id
GROUP BY m.id, m.name;

-- Upload session statistics
CREATE OR REPLACE VIEW v_upload_stats AS
SELECT 
    DATE(created_at) as upload_date,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
    AVG(file_size) as avg_file_size,
    AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_completion_time
FROM upload_sessions
GROUP BY DATE(created_at);

-- ============================================================================
-- Triggers
-- ============================================================================

DELIMITER $$

-- Update model LOD download count and last accessed time
CREATE TRIGGER after_model_lod_access
AFTER UPDATE ON model_lods
FOR EACH ROW
BEGIN
    IF NEW.download_count > OLD.download_count THEN
        UPDATE model_lods 
        SET last_accessed_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END IF;
END$$

-- Update upload session progress
CREATE TRIGGER after_chunk_upload
AFTER INSERT ON upload_chunks
FOR EACH ROW
BEGIN
    UPDATE upload_sessions 
    SET 
        uploaded_chunks = uploaded_chunks + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE upload_id = NEW.upload_id;
END$$

DELIMITER ;

-- ============================================================================
-- Initial Data / Indexes Optimization
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_device_platform_tier ON device_profiles(platform, tier);
CREATE INDEX idx_model_status_created ON models(status, created_at);
CREATE INDEX idx_upload_user_status ON upload_sessions(user_id, status);

-- Analyze tables for query optimization
ANALYZE TABLE device_profiles;
ANALYZE TABLE models;
ANALYZE TABLE model_lods;
ANALYZE TABLE upload_sessions;
ANALYZE TABLE upload_chunks;
