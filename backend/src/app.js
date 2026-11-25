const express = require('express');
const internshipRoutes = require('./routes/internshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// CORS & Security headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Root API index
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'EdVyro Task 4 — InternBoard REST API with Secure Applications',
    endpoints: {
      health: '/api/health',
      internships: '/api/internships',
      applications: '/api/applications'
    }
  });
});

// Mount REST API routes
app.use('/api', internshipRoutes);
app.use('/api', applicationRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    errors: []
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
