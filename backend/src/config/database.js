const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../database/internships.db');

let activeDb = null;

/**
 * Resolves the database file path from environment variable or default.
 * @param {string} [customPath]
 * @returns {string}
 */
function resolveDbPath(customPath) {
  if (customPath) {
    return path.resolve(customPath);
  }
  if (process.env.DATABASE_PATH) {
    return path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH);
  }
  return DEFAULT_DB_PATH;
}

/**
 * Initializes database tables using schema.sql.
 * @param {import('better-sqlite3').Database} db
 */
function initDatabase(db) {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

/**
 * Connects to or retrieves the SQLite database instance.
 * @param {string} [dbPath]
 * @returns {import('better-sqlite3').Database}
 */
function getDb(dbPath) {
  if (activeDb && !dbPath) {
    return activeDb;
  }

  const targetPath = resolveDbPath(dbPath);

  // In-memory or on-disk directory creation
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  initDatabase(db);

  if (!dbPath) {
    activeDb = db;
  }

  return db;
}

/**
 * Closes the active database connection.
 */
function closeDb() {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
}

module.exports = {
  getDb,
  closeDb,
  initDatabase,
  resolveDbPath
};
