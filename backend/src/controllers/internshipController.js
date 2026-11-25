const internshipService = require('../services/internshipService');

/**
 * Controller handling internship endpoints.
 */
const internshipController = {
  /**
   * GET /api/internships
   */
  getAll(req, res, next) {
    try {
      const page = req.query.page !== undefined ? Number(req.query.page) : 1;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;

      const result = internshipService.listInternships({ page, limit });

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
  getById(req, res, next) {
    try {
      const { id } = req.params;
      const internship = internshipService.getInternshipById(id);

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
  create(req, res, next) {
    try {
      const created = internshipService.createInternship(req.body);

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
  update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = internshipService.updateInternship(id, req.body);

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
  delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = internshipService.deleteInternship(id);

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
  healthCheck(req, res, next) {
    try {
      const dbConnected = internshipService.checkDatabaseHealth();

      if (!dbConnected) {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection check failed',
          errors: []
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
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
