const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

const windowMs = process.env.RATE_LIMIT_WINDOW_MS
  ? Number(process.env.RATE_LIMIT_WINDOW_MS)
  : 15 * 60 * 1000; // 15 minutes

const maxApplications = process.env.RATE_LIMIT_MAX
  ? Number(process.env.RATE_LIMIT_MAX)
  : 10; // 10 submissions per window per IP

/**
 * Rate limiter middleware for application submissions.
 * Prevents automated spam and repeated requests while leaving general browsing unaffected.
 */
const applicationRateLimiter = rateLimit({
  windowMs,
  max: maxApplications,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('rate_limit_exceeded', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(429).json({
      status: 'error',
      message: 'Too many application submissions from this IP, please try again later',
      errors: []
    });
  }
});

module.exports = {
  applicationRateLimiter
};
