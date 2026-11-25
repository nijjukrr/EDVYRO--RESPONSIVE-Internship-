const express = require('express');
const internshipController = require('../controllers/internshipController');
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

// POST /api/internships (Create)
router.post(
  '/internships',
  validateRequest((req) => validateCreateInternship(req.body)),
  internshipController.create
);

// PUT /api/internships/:id (Update)
router.put(
  '/internships/:id',
  validateRequest((req) => validateUpdateInternship(req.body, req.params.id)),
  internshipController.update
);

// DELETE /api/internships/:id (Delete)
router.delete('/internships/:id', internshipController.delete);

module.exports = router;
