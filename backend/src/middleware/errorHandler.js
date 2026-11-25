const { logger } = require('../utils/logger');

/**
 * Centralized Express error-handling middleware.
 * Ensures consistent error response contract without exposing raw SQL or stack traces.
 */
function errorHandler(err, req, res, next) {
  // Handle JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('malformed_json_payload', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload in request body',
      errors: []
    });
  }

  // Handle explicit API errors with status codes (e.g. 409 Conflict, 400 Bad Request)
  if (err.statusCode) {
    logger.warn('api_client_error', {
      method: req.method,
      path: req.originalUrl,
      statusCode: err.statusCode,
      message: err.message
    });
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      errors: err.errors || []
    });
  }

  // Catch SQLite constraint errors if any bypass validation
  if (err.code && typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
    logger.error('database_constraint_error', {
      code: err.code,
      path: req.originalUrl
    });
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        status: 'error',
        message: 'A record with the specified identifier already exists',
        errors: []
      });
    }
    return res.status(400).json({
      status: 'error',
      message: 'Database constraint violation',
      errors: []
    });
  }

  // Generic 500 fallback
  logger.error('unhandled_server_error', {
    method: req.method,
    path: req.originalUrl,
    error: err.message
  });
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    errors: []
  });
}

module.exports = {
  errorHandler
};
