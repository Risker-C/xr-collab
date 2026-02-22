const express = require('express');
const DeviceController = require('../controllers/deviceController');
const { validateDeviceCapability } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/device/capability
 * Analyze device capabilities and return tier classification
 */
router.post('/capability', validateDeviceCapability, DeviceController.analyzeCapability);

/**
 * GET /api/device/stats
 * Get device tier statistics
 */
router.get('/stats', DeviceController.getStats);

module.exports = router;
