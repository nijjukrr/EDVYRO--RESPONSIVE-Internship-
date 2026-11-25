const applicationService = require('../services/applicationService');
const { logger } = require('../utils/logger');

/**
 * Controller handling internship applications.
 */
const applicationController = {
  /**
   * POST /api/applications
   */
  create(req, res, next) {
    try {
      const created = applicationService.createApplication(req.body);

      logger.info('application_submitted', {
        applicationId: created.id,
        internshipId: created.internshipId
      });

      return res.status(201).json({
        status: 'success',
        data: created
      });
    } catch (err) {
      logger.warn('application_submission_rejected', {
        internshipId: typeof req.body?.internshipId === 'string' ? req.body.internshipId.trim() : null,
        statusCode: err.statusCode || 500,
        reason: err.message
      });
      next(err);
    }
  }
};

module.exports = applicationController;
