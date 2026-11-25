#!/usr/bin/env node
/**
 * Read-only migration verification command.
 * Compares source SQLite vs target PostgreSQL record counts, IDs, and foreign-key integrity.
 * Never prints student names, emails, portfolio URLs, or cover letters.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { buildPgPoolConfig } = require('../src/config/database');

async function verifyMigration(options = {}) {
  const databaseUrl = (options.databaseUrl || process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Set DATABASE_URL in environment or backend/.env.');
  }

  const sqlitePath = options.sqlitePath
    ? path.resolve(options.sqlitePath)
    : process.env.DATABASE_PATH
      ? path.resolve(__dirname, '..', process.env.DATABASE_PATH)
      : path.resolve(__dirname, '../database/internships.db');

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found: ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  let sourceInternships;
  let sourceApplications;
  try {
    sourceInternships = sqlite.prepare('SELECT id FROM internships ORDER BY id').all().map((r) => r.id);
    sourceApplications = sqlite
      .prepare('SELECT id, internship_id FROM applications ORDER BY id')
      .all()
      .map((r) => `${r.id}:${r.internship_id}`);
  } finally {
    sqlite.close();
  }

  const poolConfig = buildPgPoolConfig(databaseUrl);
  poolConfig.max = 1;
  poolConfig.connectionTimeoutMillis = 15000;
  poolConfig.application_name = 'internboard-verify-migration';
  const pool = new Pool(poolConfig);

  try {
    const pgInternshipsRes = await pool.query('SELECT id FROM internships ORDER BY id');
    const pgApplicationsRes = await pool.query(
      'SELECT id, internship_id FROM applications ORDER BY id'
    );
    const orphanRes = await pool.query(
      'SELECT COUNT(*)::int AS orphans FROM applications a LEFT JOIN internships i ON a.internship_id = i.id WHERE i.id IS NULL'
    );

    const targetInternships = pgInternshipsRes.rows.map((r) => r.id);
    const targetApplications = pgApplicationsRes.rows.map((r) => `${r.id}:${r.internship_id}`);
    const orphans = orphanRes.rows[0].orphans;

    const internshipsMatch =
      JSON.stringify(sourceInternships) === JSON.stringify(targetInternships);
    const applicationsMatch =
      JSON.stringify(sourceApplications) === JSON.stringify(targetApplications);

    return {
      source: {
        internships: sourceInternships.length,
        applications: sourceApplications.length
      },
      target: {
        internships: targetInternships.length,
        applications: targetApplications.length
      },
      orphans,
      internshipsMatch,
      applicationsMatch,
      ok: internshipsMatch && applicationsMatch && orphans === 0
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verifyMigration()
    .then((report) => {
      console.log('Migration Verification Report (PII omitted):');
      console.log(`Source SQLite Counts -> internships: ${report.source.internships}, applications: ${report.source.applications}`);
      console.log(`Target PostgreSQL Counts -> internships: ${report.target.internships}, applications: ${report.target.applications}`);
      console.log(`Internship IDs Match: ${report.internshipsMatch}`);
      console.log(`Application IDs & Foreign Keys Match: ${report.applicationsMatch}`);
      console.log(`Foreign-Key Orphans: ${report.orphans}`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('Migration verification failed:', err.message);
      process.exit(1);
    });
}

module.exports = { verifyMigration };
