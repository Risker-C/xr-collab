function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }));
}

function validateSchema(schema, target = 'body') {
  return (req, res, next) => {
    const payload = req[target] || {};
    const result = schema.safeParse(payload);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: formatZodError(result.error)
      });
    }
    req[target] = result.data;
    next();
  };
}

module.exports = { validateSchema };
