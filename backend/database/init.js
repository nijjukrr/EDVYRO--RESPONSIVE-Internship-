const { initializeActiveDatabase, closeDb } = require('../src/config/database');
const { seedDatabase } = require('./seed');

/**
 * Initializes the active database schema (SQLite or PostgreSQL) and seeds initial records safely.
 */
async function init() {
  const { mode } = await initializeActiveDatabase();
  console.log(`[Init] Schema applied successfully (${mode}).`);

  await seedDatabase();
  console.log('[Init] Database initialization complete.');
}

if (require.main === module) {
  init()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('[Init Error]:', err.message);
      await closeDb().catch(() => {});
      process.exit(1);
    });
}

module.exports = { init };
