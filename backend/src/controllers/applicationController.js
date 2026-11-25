const applicationService = require('../services/applicationService');

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

      return res.status(201).json({
        status: 'success',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = applicationController;
