const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');
const { initializeActiveDatabase, closeDb } = require('./config/database');
const { checkDatabaseHealth } = require('./services/internshipService');
const { seedDatabase } = require('../database/seed');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;
let server = null;
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('server_shutdown', { signal });

  const forceTimer = setTimeout(() => {
    logger.error('server_shutdown_timeout', { signal });
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeDb();
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (err) {
    clearTimeout(forceTimer);
    logger.error('server_shutdown_error', { error: err.message });
    process.exit(1);
  }
}

async function startServer() {
  try {
    const { mode } = await initializeActiveDatabase();
    const healthy = await checkDatabaseHealth();
    if (!healthy) {
      throw new Error(`Initial connectivity verification failed for database mode '${mode}'`);
    }

    await seedDatabase();
    logger.info('database_initialized', { mode, status: 'ready' });

    server = app.listen(PORT, () => {
      logger.info('server_started', {
        service: 'InternBoard API',
        mode,
        port: Number(PORT),
        env: process.env.NODE_ENV || 'development'
      });
    });

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('database_init_failed', { error: err.message });
    await closeDb().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, shutdown };
