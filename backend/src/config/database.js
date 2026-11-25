const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config();

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../database/internships.db');
let activeDb = null;
let activePool = null;

function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
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

function getPgPool() {
  if (!isPostgresConfigured()) throw new Error('DATABASE_URL is required for PostgreSQL mode');
  if (!activePool) {
    activePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      application_name: 'internboard-api'
    });
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
  closeDb,
  initDatabase,
  initPostgresDatabase,
  resolveDbPath,
  isPostgresConfigured
};
