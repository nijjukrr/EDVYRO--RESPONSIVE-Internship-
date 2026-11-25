#!/usr/bin/env node
/**
 * Non-destructive, transactional SQLite -> PostgreSQL migration.
 *
 * Run from backend/: node scripts/migrate-sqlite-to-postgres.js
 * Requires DATABASE_URL in environment or backend/.env.
 * Opens SQLite in read-only mode, imports internships then applications inside a single
 * PostgreSQL transaction, verifies counts and foreign-key integrity, and commits only on pass.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { buildPgPoolConfig } = require('../src/config/database');

/**
 * Converts SQLite CURRENT_TIMESTAMP UTC format ('YYYY-MM-DD HH:MM:SS') into explicit UTC ISO timestamp.
 */
function normalizeSqliteTimestamp(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    return `${str.replace(' ', 'T')}Z`;
  }
  return str;
}

/**
 * Reads all internships and applications from SQLite strictly in read-only mode,
 * adapting cleanly whether optional legacy columns (like portfolio_url) exist on disk.
 */
function readSqliteSource(sqlitePath) {
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found: ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  try {
    const appCols = new Set(
      sqlite.prepare('PRAGMA table_info(applications)').all().map((c) => c.name)
    );
    const hasPortfolioUrl = appCols.has('portfolio_url');
    const hasCoverLetter = appCols.has('cover_letter');
    const hasAppUpdatedAt = appCols.has('updated_at');

    const internships = sqlite.prepare(`
      SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
      FROM internships
      ORDER BY created_at ASC, id ASC
    `).all();

    const applications = sqlite.prepare(`
      SELECT
        id,
        internship_id,
        full_name,
        email,
        ${hasPortfolioUrl ? 'portfolio_url' : 'NULL AS portfolio_url'},
        ${hasCoverLetter ? 'cover_letter' : 'NULL AS cover_letter'},
        created_at,
        ${hasAppUpdatedAt ? 'updated_at' : 'created_at AS updated_at'}
      FROM applications
      ORDER BY created_at ASC, id ASC
    `).all();

    return { internships, applications };
  } finally {
    sqlite.close();
  }
}

async function migrateSqliteToPostgres(options = {}) {
  const databaseUrl = (options.databaseUrl || process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Add your Neon pooled connection string to backend/.env.');
  }

  const sqlitePath = options.sqlitePath
    ? path.resolve(options.sqlitePath)
    : process.env.DATABASE_PATH
      ? path.resolve(__dirname, '..', process.env.DATABASE_PATH)
      : path.resolve(__dirname, '../database/internships.db');

  const schemaPath = options.schemaPath || path.resolve(__dirname, '../database/schema.postgres.sql');
  const { internships, applications } = readSqliteSource(sqlitePath);

  const poolConfig = buildPgPoolConfig(databaseUrl);
  poolConfig.max = 1;
  poolConfig.connectionTimeoutMillis = 15000;
  poolConfig.application_name = 'internboard-one-time-migration';
  const pool = new Pool(poolConfig);

  let client;
  try {
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));

    client = await pool.connect();
    await client.query('BEGIN');

    const targetCounts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM internships) AS internships,
        (SELECT COUNT(*)::int FROM applications) AS applications
    `);
    const existing = targetCounts.rows[0];
    if (existing.internships !== 0 || existing.applications !== 0) {
      throw new Error(
        `Refusing to import into a non-empty PostgreSQL target (internships=${existing.internships}, applications=${existing.applications}). No target rows were modified.`
      );
    }

    for (const row of internships) {
      const skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
      await client.query(
        `INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::timestamptz, $9::timestamptz)`,
        [
          row.id,
          row.title,
          row.domain,
          row.mode,
          row.location,
          JSON.stringify(skills || []),
          Number(row.openings),
          normalizeSqliteTimestamp(row.created_at),
          normalizeSqliteTimestamp(row.updated_at || row.created_at)
        ]
      );
    }

    for (const row of applications) {
      await client.query(
        `INSERT INTO applications (id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)`,
        [
          row.id,
          row.internship_id,
          row.full_name,
          String(row.email).trim().toLowerCase(),
          row.portfolio_url || null,
          row.cover_letter || null,
          normalizeSqliteTimestamp(row.created_at),
          normalizeSqliteTimestamp(row.updated_at || row.created_at)
        ]
      );
    }

    const verified = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM internships) AS internships,
        (SELECT COUNT(*)::int FROM applications) AS applications,
        (SELECT COUNT(*)::int FROM applications a LEFT JOIN internships i ON a.internship_id = i.id WHERE i.id IS NULL) AS orphans
    `);
    const counts = verified.rows[0];

    if (counts.orphans !== 0) {
      throw new Error(`Foreign-key verification failed: found ${counts.orphans} orphan applications.`);
    }

    if (counts.internships !== internships.length || counts.applications !== applications.length) {
      throw new Error(
        `Verification failed: expected ${internships.length}/${applications.length}, got ${counts.internships}/${counts.applications}`
      );
    }

    await client.query('COMMIT');

    return {
      sourceCounts: { internships: internships.length, applications: applications.length },
      targetCounts: { internships: counts.internships, applications: counts.applications },
      orphans: counts.orphans
    };
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateSqliteToPostgres()
    .then((result) => {
      console.log('Migration completed successfully.');
      console.log(`Source SQLite counts -> internships: ${result.sourceCounts.internships}, applications: ${result.sourceCounts.applications}`);
      console.log(`Target PostgreSQL counts -> internships: ${result.targetCounts.internships}, applications: ${result.targetCounts.applications}`);
      console.log('Foreign-key integrity verified (orphans: 0). SQLite source opened read-only and unmodified.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  migrateSqliteToPostgres,
  readSqliteSource,
  normalizeSqliteTimestamp
};
