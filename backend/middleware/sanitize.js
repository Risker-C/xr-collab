const xss = require('xss');

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ["script"] });
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

module.exports = sanitizeMiddleware;
