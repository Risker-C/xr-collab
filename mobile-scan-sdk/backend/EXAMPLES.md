# API Request Examples

## 1. Analyze Premium Device (iPhone 15 Pro)

```bash
curl -X POST http://localhost:3000/api/device/capability \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## 2. Analyze High-End Device (Samsung Galaxy S23)

```bash
curl -X POST http://localhost:3000/api/device/capability \
  -H "Content-Type: application/json" \
  -d '{
    "device_model": "Samsung Galaxy S23",
    "os_name": "Android",
    "os_version": "13",
    "cpu_cores": 8,
    "cpu_frequency": 3.36,
    "gpu_model": "Adreno 740",
    "ram_mb": 8192,
    "has_gyroscope": true,
    "has_accelerometer": true,
    "has_magnetometer": true,
    "has_arkit": false,
    "has_arcore": true
  }'
```

## 3. Analyze Medium Device (Xiaomi Redmi Note 11)

```bash
curl -X POST http://localhost:3000/api/device/capability \
  -H "Content-Type: application/json" \
  -d '{
    "device_model": "Xiaomi Redmi Note 11",
    "os_name": "Android",
    "os_version": "12",
    "cpu_cores": 8,
    "cpu_frequency": 2.4,
    "gpu_model": "Mali-G57",
    "ram_mb": 4096,
    "has_gyroscope": true,
    "has_accelerometer": true,
    "has_magnetometer": false,
    "has_arkit": false,
    "has_arcore": true
  }'
```

## 4. Analyze Low-End Device

```bash
curl -X POST http://localhost:3000/api/device/capability \
  -H "Content-Type: application/json" \
  -d '{
    "device_model": "Budget Phone",
    "os_name": "Android",
    "os_version": "11",
    "cpu_cores": 4,
    "cpu_frequency": 1.8,
    "gpu_model": "Mali-G52",
    "ram_mb": 2048,
    "has_gyroscope": false,
    "has_accelerometer": true,
    "has_magnetometer": false,
    "has_arkit": false,
    "has_arcore": false
  }'
```

## 5. Get Statistics

```bash
curl http://localhost:3000/api/device/stats
```

## 6. Health Check

```bash
curl http://localhost:3000/health
```
