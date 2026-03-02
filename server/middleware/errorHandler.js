// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.message.includes('duplicate key')) {
    return res.status(400).json({ error: 'This resource already exists' });
  }

  if (err.message.includes('validation')) {
    return res.status(400).json({ error: 'Validation error: ' + err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
