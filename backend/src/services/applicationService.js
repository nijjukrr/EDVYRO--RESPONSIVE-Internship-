const { getDb, getPgPool, getDbMode } = require('../config/database');

function formatTimestamp(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Normalizes a SQLite or PostgreSQL application row for API responses.
 * @param {object} row
 * @returns {object|null}
 */
function formatApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    internshipId: row.internship_id,
    fullName: row.full_name,
    email: row.email,
    portfolioUrl: row.portfolio_url || null,
    coverLetter: row.cover_letter || null,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at)
  };
}

function resolveTarget(explicitDb) {
  if (explicitDb && typeof explicitDb.query === 'function') {
    return { mode: 'postgres', pool: explicitDb };
  }
  if (explicitDb) {
    return { mode: 'sqlite', db: explicitDb };
  }
  const mode = getDbMode();
  return mode === 'postgres'
    ? { mode: 'postgres', pool: getPgPool() }
    : { mode: 'sqlite', db: getDb() };
}

function buildMissingInternshipError(trimmedInternshipId) {
  const error = new Error(`Internship with ID '${trimmedInternshipId}' does not exist`);
  error.statusCode = 404;
  error.errors = [
    { field: 'internshipId', message: `Internship with ID '${trimmedInternshipId}' does not exist` }
  ];
  return error;
}

function buildDuplicateApplicationError() {
  const error = new Error('An application with this email already exists for this internship');
  error.statusCode = 409;
  error.errors = [
    {
      field: 'email',
      message: 'An application with this email already exists for this internship'
    }
  ];
  return error;
}

/**
 * Creates a new application using parameterized SQL in SQLite or PostgreSQL.
 * Verifies referenced internship existence and enforces unique candidate submission per role.
 */
async function createApplication(data, db) {
  const trimmedInternshipId = data.internshipId.trim();
  const trimmedFullName = data.fullName.trim();
  const normalizedEmail = data.email.trim().toLowerCase();
  const sanitizedPortfolioUrl =
    data.portfolioUrl && typeof data.portfolioUrl === 'string' && data.portfolioUrl.trim()
      ? data.portfolioUrl.trim()
      : null;
  const sanitizedCoverLetter =
    data.coverLetter && typeof data.coverLetter === 'string' && data.coverLetter.trim()
      ? data.coverLetter.trim()
      : null;

  const target = resolveTarget(db);
  const id = `APP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  if (target.mode === 'postgres') {
    const internshipRes = await target.pool.query(
      'SELECT id, title FROM internships WHERE id = $1',
      [trimmedInternshipId]
    );
    if (internshipRes.rowCount === 0) {
      throw buildMissingInternshipError(trimmedInternshipId);
    }

    const existingRes = await target.pool.query(
      'SELECT id FROM applications WHERE internship_id = $1 AND lower(email) = $2',
      [trimmedInternshipId, normalizedEmail]
    );
    if (existingRes.rowCount > 0) {
      throw buildDuplicateApplicationError();
    }

    try {
      const insertRes = await target.pool.query(
        `INSERT INTO applications (id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at`,
        [id, trimmedInternshipId, trimmedFullName, normalizedEmail, sanitizedPortfolioUrl, sanitizedCoverLetter]
      );
      return formatApplication(insertRes.rows[0]);
    } catch (err) {
      if (err && err.code === '23505') {
        throw buildDuplicateApplicationError();
      }
      throw err;
    }
  }

  const internship = target.db
    .prepare('SELECT id, title FROM internships WHERE id = ?')
    .get(trimmedInternshipId);

  if (!internship) {
    throw buildMissingInternshipError(trimmedInternshipId);
  }

  const existingApp = target.db
    .prepare('SELECT id FROM applications WHERE internship_id = ? AND lower(email) = ?')
    .get(trimmedInternshipId, normalizedEmail);

  if (existingApp) {
    throw buildDuplicateApplicationError();
  }

  target.db.prepare(`
    INSERT INTO applications (id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, trimmedInternshipId, trimmedFullName, normalizedEmail, sanitizedPortfolioUrl, sanitizedCoverLetter);

  const row = target.db
    .prepare(
      'SELECT id, internship_id, full_name, email, portfolio_url, cover_letter, created_at, updated_at FROM applications WHERE id = ?'
    )
    .get(id);

  return formatApplication(row);
}

module.exports = {
  createApplication,
  formatApplication
};
