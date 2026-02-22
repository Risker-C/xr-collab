const Joi = require('joi');

/**
 * Validation schemas for device capability requests
 */
const deviceCapabilitySchema = Joi.object({
  device_model: Joi.string().required().max(255),
  os_name: Joi.string().required().max(50),
  os_version: Joi.string().required().max(50),
  
  cpu_cores: Joi.number().integer().min(1).max(32).required(),
  cpu_frequency: Joi.number().min(0.1).max(10.0).required(),
  gpu_model: Joi.string().max(255).allow('', null),
  ram_mb: Joi.number().integer().min(512).max(524288).required(),
  
  has_gyroscope: Joi.boolean().default(false),
  has_accelerometer: Joi.boolean().default(false),
  has_magnetometer: Joi.boolean().default(false),
  has_arkit: Joi.boolean().default(false),
  has_arcore: Joi.boolean().default(false)
});

/**
 * Validate device capability request
 */
const validateDeviceCapability = (req, res, next) => {
  const { error, value } = deviceCapabilitySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors
    });
  }
  
  req.body = value; // Use validated data
  next();
};

module.exports = {
  validateDeviceCapability
};
