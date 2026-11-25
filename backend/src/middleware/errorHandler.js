/**
 * Centralized Express error-handling middleware.
 * Ensures consistent error response contract without exposing raw SQL or stack traces.
 */
function errorHandler(err, req, res, next) {
  // Handle JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload in request body',
      errors: []
    });
  }

  // Handle explicit API errors with status codes (e.g. 409 Conflict, 400 Bad Request)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      errors: err.errors || []
    });
  }

  // Catch SQLite constraint errors if any bypass validation
  if (err.code && typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
    console.error('[Database Constraint Error]:', err.message);
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
  console.error('[Unhandled Server Error]:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    errors: []
  });
}

module.exports = {
  errorHandler
};
