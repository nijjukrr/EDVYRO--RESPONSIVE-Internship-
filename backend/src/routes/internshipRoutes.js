const express = require('express');
const internshipController = require('../controllers/internshipController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  validatePaginationQuery,
  validateCreateInternship,
  validateUpdateInternship
} = require('../validators/internshipValidator');

const router = express.Router();

// GET /api/health
router.get('/health', internshipController.healthCheck);

// GET /api/internships (Paginated list)
router.get(
  '/internships',
  validateRequest((req) => validatePaginationQuery(req.query)),
  internshipController.getAll
);

// GET /api/internships/:id
router.get('/internships/:id', internshipController.getById);

// POST /api/internships (Protected admin create)
router.post(
  '/internships',
  requireAdminAuth,
  validateRequest((req) => validateCreateInternship(req.body)),
  internshipController.create
);

// PUT /api/internships/:id (Protected admin update)
router.put(
  '/internships/:id',
  requireAdminAuth,
  validateRequest((req) => validateUpdateInternship(req.body, req.params.id)),
  internshipController.update
);

// DELETE /api/internships/:id (Protected admin delete)
router.delete('/internships/:id', requireAdminAuth, internshipController.delete);

module.exports = router;
