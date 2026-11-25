#!/usr/bin/env node
/**
 * One-time, non-destructive SQLite -> PostgreSQL migration.
 *
 * Run from backend/: node scripts/migrate-sqlite-to-postgres.js
 * Requires DATABASE_URL in backend/.env.
 * The target PostgreSQL tables must be empty. The SQLite source is opened read-only.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing. Add your Neon pooled connection string to backend/.env.');

  const sqlitePath = process.env.DATABASE_PATH
    ? path.resolve(__dirname, '..', process.env.DATABASE_PATH)
    : path.resolve(__dirname, '../database/internships.db');
  if (!fs.existsSync(sqlitePath)) throw new Error(`SQLite database not found: ${sqlitePath}`);

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 15000,
    application_name: 'internboard-one-time-migration'
  });

  let client;
  try {
    const internships = sqlite.prepare(`
      SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
      FROM internships ORDER BY id
    `).all();
    const applications = sqlite.prepare(`
      SELECT id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at
      FROM applications ORDER BY id
    `).all();

    const schemaPath = path.resolve(__dirname, '../database/schema.postgres.sql');
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
        `Refusing to import into a non-empty Neon database (internships=${existing.internships}, applications=${existing.applications}). No target rows were changed.`
      );
    }

    for (const row of internships) {
      const skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
      await client.query(
        `INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
        [row.id, row.title, row.domain, row.mode, row.location, JSON.stringify(skills || []), row.openings, row.created_at, row.updated_at]
      );
    }

    for (const row of applications) {
      await client.query(
        `INSERT INTO applications (id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row.id, row.internship_id, row.full_name, row.email, row.portfolio_url, row.cover_letter, row.created_at, row.updated_at]
      );
    }

    const verified = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM internships) AS internships,
        (SELECT COUNT(*)::int FROM applications) AS applications
    `);
    const counts = verified.rows[0];
    if (counts.internships !== internships.length || counts.applications !== applications.length) {
      throw new Error(
        `Verification failed: expected ${internships.length}/${applications.length}, got ${counts.internships}/${counts.applications}`
      );
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
    console.log(`Internships migrated: ${counts.internships}`);
    console.log(`Applications migrated: ${counts.applications}`);
    console.log('SQLite source was opened read-only and was not modified.');
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    throw error;
  } finally {
    if (client) client.release();
    sqlite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
