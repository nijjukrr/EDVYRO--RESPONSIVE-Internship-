const express = require('express');
const path = require('path');
const helmet = require('helmet');
const internshipRoutes = require('./routes/internshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Secure HTTP headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Deliberate CORS policy: allow local development ports, configured CORS_ORIGINS, and GitHub Pages origin
const LOCAL_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const EXTRA_ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);
const STATIC_ALLOWED_ORIGINS = new Set(['https://nijjukrr.github.io', ...EXTRA_ALLOWED_ORIGINS]);

function isOriginPermitted(origin) {
  if (!origin) return false;
  return LOCAL_ORIGIN_PATTERN.test(origin) || STATIC_ALLOWED_ORIGINS.has(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginPermitted(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Root API index (Preserved for Task 3 contracts and tests)
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

// Serve static frontend files from project root
app.use(express.static(path.resolve(__dirname, '../../')));

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
