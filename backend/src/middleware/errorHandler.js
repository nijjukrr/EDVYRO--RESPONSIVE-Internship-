const { logger } = require('../utils/logger');

const PG_ERROR_MAP = {
  '23505': { status: 409, message: 'A record with the specified unique values already exists' },
  '23503': { status: 409, message: 'Operation violates a referenced record constraint' },
  '23502': { status: 400, message: 'Missing required database field' },
  '23514': { status: 400, message: 'Database constraint violation' },
  '22P02': { status: 400, message: 'Invalid data format in request' }
};

/**
 * Centralized Express error-handling middleware.
 * Ensures consistent error response contract without exposing raw SQL, PII, or stack traces.
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

  // Handle explicit API errors with status codes (e.g. 409 Conflict, 400 Bad Request, 404 Not Found)
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

  // Catch PostgreSQL constraint / data exceptions cleanly without leaking raw SQL
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    logger.error('postgres_constraint_error', {
      code: err.code,
      path: req.originalUrl
    });
    return res.status(mapped.status).json({
      status: 'error',
      message: mapped.message,
      errors: []
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
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({
        status: 'error',
        message: 'Operation violates a referenced record constraint',
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
