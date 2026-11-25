const { getDb, initDatabase } = require('../src/config/database');
const { seedDatabase } = require('./seed');

/**
 * Initializes the SQLite database schema and seeds initial data.
 */
function init() {
  console.log('[Init] Initializing SQLite database schema...');
  const db = getDb();
  initDatabase(db);
  console.log('[Init] Schema applied successfully.');

  console.log('[Init] Seeding official EdVyro internship records...');
  seedDatabase(db);
  console.log('[Init] Database initialization complete.');
}

if (require.main === module) {
  try {
    init();
    process.exit(0);
  } catch (err) {
    console.error('[Init Error]:', err.message);
    process.exit(1);
  }
}

module.exports = { init };
