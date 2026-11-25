require('dotenv').config();
const app = require('./app');
const { getDb, initDatabase } = require('./config/database');
const { seedDatabase } = require('../database/seed');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Ensure database schema and seed data exist on startup
try {
  const db = getDb();
  initDatabase(db);
  seedDatabase(db);
  logger.info('database_initialized', { status: 'ready' });
} catch (err) {
  logger.error('database_init_failed', { error: err.message });
}

const server = app.listen(PORT, () => {
  logger.info('server_started', {
    service: 'InternBoard API',
    port: Number(PORT),
    env: process.env.NODE_ENV || 'development'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('server_shutdown', { signal: 'SIGINT' });
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('server_shutdown', { signal: 'SIGTERM' });
  server.close(() => {
    process.exit(0);
  });
});
