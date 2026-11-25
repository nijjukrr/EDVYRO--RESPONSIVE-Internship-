/**
 * Creates an Express validation middleware for a validator function.
 * @param {(req: import('express').Request) => { isValid: boolean, errors: Array<{ field: string, message: string }> }} validatorFn
 */
function validateRequest(validatorFn) {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req);
    if (!isValid) {
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
