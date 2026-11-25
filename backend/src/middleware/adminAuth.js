const crypto = require('crypto');
const { logger } = require('../utils/logger');

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function constantTimeHexEqual(hexA, hexB) {
  if (typeof hexA !== 'string' || typeof hexB !== 'string') return false;
  if (hexA.length !== 64 || hexB.length !== 64 || !/^[0-9a-f]{64}$/i.test(hexA) || !/^[0-9a-f]{64}$/i.test(hexB)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hexA.toLowerCase(), 'hex'), Buffer.from(hexB.toLowerCase(), 'hex'));
}

function extractAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  return null;
}

/**
 * Resolves configured SHA-256 admin digest from ADMIN_API_KEY_HASH or ADMIN_API_TOKEN.
 * Never embeds or returns plaintext credentials.
 */
function getConfiguredAdminDigest() {
  const explicitHash = (process.env.ADMIN_API_KEY_HASH || '').trim();
  if (explicitHash) {
    return explicitHash.toLowerCase();
  }
  const plainToken = (process.env.ADMIN_API_TOKEN || '').trim();
  if (plainToken) {
    return sha256Hex(plainToken);
  }
  return null;
}

/**
 * Protects administrative write operations (POST/PUT/DELETE /api/internships).
 * - Always requires valid token when ADMIN_API_TOKEN or ADMIN_API_KEY_HASH is configured.
 * - Fails closed (401) in NODE_ENV=production if admin credentials are unconfigured.
 * - Leaves local dev/test CRUD accessible when unconfigured so local tests run cleanly.
 */
function requireAdminAuth(req, res, next) {
  const configuredDigest = getConfiguredAdminDigest();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!configuredDigest) {
    if (isProduction) {
      logger.warn('admin_auth_unconfigured_in_production', {
        method: req.method,
        path: req.originalUrl
      });
      return res.status(401).json({
        status: 'error',
        message: 'Admin authorization is required for this operation',
        errors: []
      });
    }
    return next();
  }

  const suppliedToken = extractAdminToken(req);
  if (!suppliedToken) {
    logger.warn('admin_auth_missing', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(401).json({
      status: 'error',
      message: 'Authentication credentials are required for admin operations',
      errors: []
    });
  }

  const suppliedDigest = sha256Hex(suppliedToken);
  if (!constantTimeHexEqual(suppliedDigest, configuredDigest)) {
    logger.warn('admin_auth_invalid', {
      method: req.method,
      path: req.originalUrl
    });
    return res.status(403).json({
      status: 'error',
      message: 'Invalid admin authorization credentials',
      errors: []
    });
  }

  return next();
}

module.exports = {
  requireAdminAuth,
  sha256Hex,
  getConfiguredAdminDigest
};
