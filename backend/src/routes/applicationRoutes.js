const express = require('express');
const applicationController = require('../controllers/applicationController');
const { validateRequest } = require('../middleware/validateRequest');
const { validateCreateApplication } = require('../validators/applicationValidator');
const { applicationRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/applications (Create application with rate limiting and schema validation)
router.post(
  '/applications',
  applicationRateLimiter,
  validateRequest((req) => validateCreateApplication(req.body)),
  applicationController.create
);

module.exports = router;

