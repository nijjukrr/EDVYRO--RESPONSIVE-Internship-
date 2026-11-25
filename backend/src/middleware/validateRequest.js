const { logger } = require('../utils/logger');

/**
 * Creates an Express validation middleware for a validator function.
 * @param {(req: import('express').Request) => { isValid: boolean, errors: Array<{ field: string, message: string }> }} validatorFn
 */
function validateRequest(validatorFn) {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req);
    if (!isValid) {
      logger.warn('validation_failed', {
        method: req.method,
        path: req.originalUrl,
        fields: errors.map((e) => e.field)
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    next();
  };
}

module.exports = {
  validateRequest
};
