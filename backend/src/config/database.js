const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../database/internships.db');
let activeDb = null;
let activePool = null;

function isProductionEnv() {
  return process.env.NODE_ENV === 'production';
}

function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

/**
 * Resolves the active database mode.
 * Production strictly requires DATABASE_URL and never falls back silently to SQLite.
 * @returns {'postgres' | 'sqlite'}
 */
function getDbMode() {
  if (isPostgresConfigured()) {
    return 'postgres';
  }
  if (isProductionEnv()) {
    throw new Error('DATABASE_URL is required when NODE_ENV=production. Refusing to fall back to SQLite.');
  }
  return 'sqlite';
}

function resolveDbPath(customPath) {
  if (customPath) return path.resolve(customPath);
  if (process.env.DATABASE_PATH) {
    return path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH);
  }
  return DEFAULT_DB_PATH;
}

function initDatabase(db) {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  const applicationColumns = db.prepare('PRAGMA table_info(applications)').all();
  if (!applicationColumns.some((column) => column.name === 'portfolio_url')) {
    db.exec('ALTER TABLE applications ADD COLUMN portfolio_url TEXT');
  }
}

function getDb(dbPath) {
  if (activeDb && !dbPath) return activeDb;
  const targetPath = resolveDbPath(dbPath);
  if (targetPath !== ':memory:') fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const db = new Database(targetPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  initDatabase(db);
  if (!dbPath) activeDb = db;
  return db;
}

function isLocalPostgresHost(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const host = (parsed.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Builds PostgreSQL Pool configuration cleanly for Neon and local PostgreSQL.
 * @param {string} [connectionString]
 */
function buildPgPoolConfig(connectionString = process.env.DATABASE_URL) {
  const config = {
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    application_name: 'internboard-api'
  };

  if (
    connectionString &&
    !connectionString.includes('sslmode=') &&
    !isLocalPostgresHost(connectionString)
  ) {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
}

function getPgPool() {
  if (!isPostgresConfigured()) {
    throw new Error('DATABASE_URL is required for PostgreSQL mode');
  }
  if (!activePool) {
    activePool = new Pool(buildPgPoolConfig(process.env.DATABASE_URL.trim()));
    activePool.on('error', (error) => {
      console.error('[InternBoard] Idle PostgreSQL client error:', error.message);
    });
  }
  return activePool;
}

async function initPostgresDatabase(pool = getPgPool()) {
  const schemaPath = path.resolve(__dirname, '../../database/schema.postgres.sql');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));
}

/**
 * Initializes the configured database engine and verifies connectivity before traffic is accepted.
 * @returns {Promise<{ mode: 'postgres', pool: import('pg').Pool } | { mode: 'sqlite', db: import('better-sqlite3').Database }>}
 */
async function initializeActiveDatabase() {
  const mode = getDbMode();

  if (mode === 'postgres') {
    const pool = getPgPool();
    await pool.query('SELECT 1 AS ok');
    await initPostgresDatabase(pool);
    return { mode: 'postgres', pool };
  }

  const db = getDb();
  initDatabase(db);
  db.prepare('SELECT 1 AS ok').get();
  return { mode: 'sqlite', db };
}

/**
 * Closes active SQLite and PostgreSQL connections cleanly.
 * Closes SQLite synchronously first so existing synchronous tests remain unaffected.
 */
async function closeDb() {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
  if (activePool) {
    const pool = activePool;
    activePool = null;
    await pool.end();
  }
}

module.exports = {
  getDb,
  getPgPool,
  getDbMode,
  buildPgPoolConfig,
  closeDb,
  initDatabase,
  initPostgresDatabase,
  initializeActiveDatabase,
  resolveDbPath,
  isPostgresConfigured
};
