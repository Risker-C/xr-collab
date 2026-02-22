# XR Collab Mobile Scan SDK - Backend API

## Device Capability Detection & Grading System

### Overview
RESTful API service for device capability detection and 4-tier grading system. Built with Node.js, Express, PostgreSQL, and Redis.

---

## API Endpoints

### 1. Analyze Device Capability

**Endpoint:** `POST /api/device/capability`

**Description:** Analyzes device hardware capabilities and returns tier classification.

**Request Body:**
```json
{
  "device_model": "iPhone 15 Pro",
  "os_name": "iOS",
  "os_version": "17.0",
  "cpu_cores": 6,
  "cpu_frequency": 3.46,
  "gpu_model": "Apple A17 Pro GPU",
  "ram_mb": 8192,
  "has_gyroscope": true,
  "has_accelerometer": true,
  "has_magnetometer": true,
  "has_arkit": true,
  "has_arcore": false
}
```

**Required Fields:**
- `device_model` (string, max 255): Device model name
- `os_name` (string, max 50): Operating system name
- `os_version` (string, max 50): OS version
- `cpu_cores` (integer, 1-32): Number of CPU cores
- `cpu_frequency` (number, 0.1-10.0): CPU frequency in GHz
- `ram_mb` (integer, 512-524288): RAM in megabytes

**Optional Fields:**
- `gpu_model` (string, max 255): GPU model name
- `has_gyroscope` (boolean, default: false)
- `has_accelerometer` (boolean, default: false)
- `has_magnetometer` (boolean, default: false)
- `has_arkit` (boolean, default: false)
- `has_arcore` (boolean, default: false)

**Response (201 Created):**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "id": 1,
    "device_fingerprint": "a3c5f8...",
    "device_model": "iPhone 15 Pro",
    "os_name": "iOS",
    "os_version": "17.0",
    "cpu_cores": 6,
    "cpu_frequency": 3.46,
    "gpu_model": "Apple A17 Pro GPU",
    "ram_mb": 8192,
    "has_gyroscope": true,
    "has_accelerometer": true,
    "has_magnetometer": true,
    "has_arkit": true,
    "has_arcore": false,
    "tier": "premium",
    "tier_score": 93,
    "created_at": "2026-02-22T14:21:00.000Z",
    "updated_at": "2026-02-22T14:21:00.000Z",
    "last_seen_at": "2026-02-22T14:21:00.000Z",
    "recommendations": {
      "maxQuality": "4K",
      "recommendedQuality": "1440p",
      "maxFPS": 60,
      "features": [
        "full_ar",
        "high_poly_models",
        "real_time_shadows",
        "post_processing"
      ]
    }
  }
}
```

**Response (200 OK - Cached):**
Same structure as above, but `cached: true` indicates result was retrieved from cache or database.

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "cpu_cores",
      "message": "\"cpu_cores\" is required"
    }
  ]
}
```

---

### 2. Get Device Statistics

**Endpoint:** `GET /api/device/stats`

**Description:** Returns device tier distribution statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "tier": "premium", "count": "45" },
    { "tier": "high", "count": "123" },
    { "tier": "medium", "count": "89" },
    { "tier": "low", "count": "34" }
  ]
}
```

---

### 3. Health Check

**Endpoint:** `GET /health`

**Description:** Service health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T14:21:00.000Z"
}
```

---

## Device Tier System

### Tier Classifications

| Tier | Score Range | Description |
|------|-------------|-------------|
| **Premium** | 80-100 | Flagship devices with full AR support |
| **High** | 60-79 | High-end devices with good performance |
| **Medium** | 40-59 | Mid-range devices with basic capabilities |
| **Low** | 0-39 | Entry-level devices with limited capabilities |

### Scoring Algorithm

**Total Score: 0-100 points**

1. **CPU Score (0-25 points)**
   - Core count: 0-15 points
     - 8+ cores: 15 pts
     - 6+ cores: 12 pts
     - 4+ cores: 9 pts
     - 2+ cores: 5 pts
   - Frequency: 0-10 points
     - 3.0+ GHz: 10 pts
     - 2.5+ GHz: 8 pts
     - 2.0+ GHz: 6 pts
     - 1.5+ GHz: 4 pts

2. **RAM Score (0-20 points)**
   - 12GB+: 20 pts
   - 8GB+: 17 pts
   - 6GB+: 14 pts
   - 4GB+: 11 pts
   - 3GB+: 8 pts
   - 2GB+: 5 pts
   - <2GB: 2 pts

3. **GPU Score (0-20 points)**
   - Premium (Apple A15+, Adreno 7xx, Mali-G78+): 20 pts
   - High-end (Apple A13-A14, Adreno 6xx, Mali-G76-G77): 15 pts
   - Mid-range (Apple A12, Adreno 5xx, Mali-G71-G72): 10 pts
   - Entry-level: 5 pts

4. **Sensor Score (0-20 points)**
   - Gyroscope: 6 pts
   - Accelerometer: 6 pts
   - Magnetometer: 4 pts
   - All three bonus: +4 pts

5. **AR Support (0-15 points)**
   - ARKit: 8 pts
   - ARCore: 7 pts

### Tier Recommendations

Each tier includes recommended settings:

**Premium Tier:**
- Max Quality: 4K
- Recommended: 1440p
- Max FPS: 60
- Features: Full AR, high-poly models, real-time shadows, post-processing

**High Tier:**
- Max Quality: 1440p
- Recommended: 1080p
- Max FPS: 60
- Features: Full AR, medium-poly models, basic shadows

**Medium Tier:**
- Max Quality: 1080p
- Recommended: 720p
- Max FPS: 30
- Features: Basic AR, low-poly models, no shadows

**Low Tier:**
- Max Quality: 720p
- Recommended: 480p
- Max FPS: 30
- Features: No AR, minimal-poly models, no effects

---

## Caching Strategy

### Device Fingerprinting
Unique device fingerprint generated from:
- Device model
- OS name and version
- CPU cores
- GPU model
- RAM size

**Hash:** SHA-256

### Cache Layers

1. **Redis Cache**
   - TTL: 24 hours (configurable)
   - Key format: `device:{fingerprint}`
   - Fast retrieval for repeated requests

2. **PostgreSQL Database**
   - Persistent storage
   - Historical tracking
   - Analytics support

### Cache Flow
1. Check Redis cache
2. If miss, check PostgreSQL
3. If miss, analyze and grade device
4. Store in PostgreSQL
5. Cache in Redis
6. Return result

---

## Rate Limiting

- **Window:** 15 minutes (configurable)
- **Max Requests:** 100 per window per IP (configurable)
- **Scope:** All `/api/*` endpoints

---

## Installation & Setup

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 15
- Redis 7

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=xr_collab_sdk
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache
DEVICE_CACHE_TTL=86400

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Start production server
npm start
```

### Testing

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

---

## Database Schema

### `device_profiles` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| device_fingerprint | VARCHAR(64) | UNIQUE, NOT NULL | Device identifier hash |
| device_model | VARCHAR(255) | | Device model name |
| os_name | VARCHAR(50) | | Operating system |
| os_version | VARCHAR(50) | | OS version |
| cpu_cores | INTEGER | | Number of CPU cores |
| cpu_frequency | DECIMAL(10,2) | | CPU frequency in GHz |
| gpu_model | VARCHAR(255) | | GPU model name |
| ram_mb | INTEGER | | RAM in megabytes |
| has_gyroscope | BOOLEAN | DEFAULT false | Gyroscope sensor |
| has_accelerometer | BOOLEAN | DEFAULT false | Accelerometer sensor |
| has_magnetometer | BOOLEAN | DEFAULT false | Magnetometer sensor |
| has_arkit | BOOLEAN | DEFAULT false | ARKit support |
| has_arcore | BOOLEAN | DEFAULT false | ARCore support |
| tier | VARCHAR(20) | NOT NULL | Device tier classification |
| tier_score | INTEGER | NOT NULL | Numeric score 0-100 |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |
| last_seen_at | TIMESTAMP | DEFAULT NOW() | Last API request time |

**Indexes:**
- `idx_device_fingerprint` on `device_fingerprint`
- `idx_tier` on `tier`
- `idx_created_at` on `created_at`

---

## Error Handling

### HTTP Status Codes
- `200 OK` - Successful retrieval (cached)
- `201 Created` - New device profile created
- `400 Bad Request` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": []
}
```

---

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - DDoS protection
- **Input Validation** - Joi schema validation
- **SQL Injection Protection** - Parameterized queries

---

## Performance Considerations

- **Connection Pooling** - PostgreSQL connection pool (max: 20)
- **Redis Caching** - Fast retrieval for repeated requests
- **Indexed Queries** - Optimized database queries
- **Request Logging** - Morgan middleware for monitoring

---

## Future Enhancements

- [ ] Batch device analysis endpoint
- [ ] Device capability comparison
- [ ] Historical trend analysis
- [ ] Machine learning-based tier prediction
- [ ] GraphQL API support
- [ ] WebSocket real-time updates

---

## Support

For issues or questions, please contact the XR Collab Team.

**Version:** 1.0.0  
**Last Updated:** 2026-02-22
