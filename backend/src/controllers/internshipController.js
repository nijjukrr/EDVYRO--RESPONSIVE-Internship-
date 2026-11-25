const internshipService = require('../services/internshipService');
const { logger } = require('../utils/logger');

/**
 * Controller handling internship endpoints.
 */
const internshipController = {
  /**
   * GET /api/internships
   */
  async getAll(req, res, next) {
    try {
      const page = req.query.page !== undefined ? Number(req.query.page) : 1;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;

      const result = await internshipService.listInternships({ page, limit });

      return res.status(200).json({
        status: 'success',
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/internships/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const internship = await internshipService.getInternshipById(id);

      if (!internship) {
        return res.status(404).json({
          status: 'error',
          message: `Internship with ID '${id}' not found`,
          errors: []
        });
      }

      return res.status(200).json({
        status: 'success',
        data: internship
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/internships
   */
  async create(req, res, next) {
    try {
      const created = await internshipService.createInternship(req.body);

      return res.status(201).json({
        status: 'success',
        data: created
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/internships/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await internshipService.updateInternship(id, req.body);

      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: `Internship with ID '${id}' not found`,
          errors: []
        });
      }

      return res.status(200).json({
        status: 'success',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/internships/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await internshipService.deleteInternship(id);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: `Internship with ID '${id}' not found`,
          errors: []
        });
      }

      return res.status(200).json({
        status: 'success',
        message: `Internship with ID '${id}' deleted successfully`,
        data: null
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/health
   */
  async healthCheck(req, res, next) {
    try {
      const dbConnected = await internshipService.checkDatabaseHealth();

      if (!dbConnected) {
        logger.error('health_check_failed', { database: 'disconnected' });
        return res.status(503).json({
          status: 'error',
          message: 'Database connection check failed',
          errors: []
        });
      }

      logger.info('health_check_ok', { database: 'connected' });
      return res.status(200).json({
        status: 'success',
        data: {
          service: 'InternBoard API',
          api: 'running',
          database: 'connected'
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = internshipController;
