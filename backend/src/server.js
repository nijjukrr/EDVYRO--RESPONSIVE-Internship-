require('dotenv').config();
const app = require('./app');
const { getDb, initDatabase } = require('./config/database');
const { seedDatabase } = require('../database/seed');

const PORT = process.env.PORT || 5000;

// Ensure database schema and seed data exist on startup
try {
  const db = getDb();
  initDatabase(db);
  seedDatabase(db);
} catch (err) {
  console.error('[Startup Warning]: Database initialization failed:', err.message);
}

const server = app.listen(PORT, () => {
  console.log(`[InternBoard API] Server running on http://localhost:${PORT}`);
  console.log(`[InternBoard API] Health check at http://localhost:${PORT}/api/health`);
  console.log(`[InternBoard API] Internships at http://localhost:${PORT}/api/internships`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[InternBoard API] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
