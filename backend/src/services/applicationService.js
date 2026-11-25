const { getDb } = require('../config/database');

/**
 * Normalizes an application database row for API response.
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
    coverLetter: row.cover_letter || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Creates a new application in SQLite using parameterized SQL.
 * Verifies referenced internship existence and enforces single application per email/internship.
 * @param {object} data
 * @param {import('better-sqlite3').Database} [db]
 */
function createApplication(data, db = getDb()) {
  const trimmedInternshipId = data.internshipId.trim();
  const trimmedFullName = data.fullName.trim();
  const normalizedEmail = data.email.trim().toLowerCase();
  const sanitizedCoverLetter =
    data.coverLetter && typeof data.coverLetter === 'string' && data.coverLetter.trim()
      ? data.coverLetter.trim()
      : null;

  // 1. Verify that referenced internship exists
  const internship = db
    .prepare('SELECT id, title FROM internships WHERE id = ?')
    .get(trimmedInternshipId);

  if (!internship) {
    const error = new Error(`Internship with ID '${trimmedInternshipId}' does not exist`);
    error.statusCode = 404;
    error.errors = [
      { field: 'internshipId', message: `Internship with ID '${trimmedInternshipId}' does not exist` }
    ];
    throw error;
  }

  // 2. Check for duplicate application (same email for same internship)
  const existingApp = db
    .prepare('SELECT id FROM applications WHERE internship_id = ? AND lower(email) = ?')
    .get(trimmedInternshipId, normalizedEmail);

  if (existingApp) {
    const error = new Error('An application with this email already exists for this internship');
    error.statusCode = 409;
    error.errors = [
      {
        field: 'email',
        message: 'An application with this email already exists for this internship'
      }
    ];
    throw error;
  }

  // 3. Generate unique application ID
  const id = `APP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // 4. Parameterized SQL insert
  db.prepare(`
    INSERT INTO applications (id, internship_id, full_name, email, cover_letter, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, trimmedInternshipId, trimmedFullName, normalizedEmail, sanitizedCoverLetter);

  const row = db
    .prepare(
      'SELECT id, internship_id, full_name, email, cover_letter, created_at, updated_at FROM applications WHERE id = ?'
    )
    .get(id);

  return formatApplication(row);
}

module.exports = {
  createApplication,
  formatApplication
};
