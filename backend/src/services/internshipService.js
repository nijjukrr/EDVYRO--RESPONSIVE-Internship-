const { getDb } = require('../config/database');

/**
 * Normalizes an SQLite database row into an API internship object.
 * @param {object} row
 * @returns {object|null}
 */
function formatInternship(row) {
  if (!row) return null;

  let parsedSkills = [];
  try {
    parsedSkills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
  } catch {
    parsedSkills = [];
  }

  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    mode: row.mode,
    location: row.location,
    skills: parsedSkills,
    openings: Number(row.openings),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Returns a paginated list of internships.
 * @param {{ page?: number, limit?: number, db?: import('better-sqlite3').Database }} options
 */
function listInternships({ page = 1, limit = 10, db = getDb() } = {}) {
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const countRow = db.prepare('SELECT COUNT(*) AS total FROM internships').get();
  const totalRecords = countRow ? countRow.total : 0;
  const totalPages = Math.ceil(totalRecords / limitNum) || 1;

  const rows = db.prepare(`
    SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
    FROM internships
    ORDER BY created_at ASC, id ASC
    LIMIT ? OFFSET ?
  `).all(limitNum, offset);

  return {
    data: rows.map(formatInternship),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalRecords,
      totalPages
    }
  };
}

/**
 * Retrieves a single internship by its ID.
 * @param {string} id
 * @param {import('better-sqlite3').Database} [db]
 */
function getInternshipById(id, db = getDb()) {
  const row = db.prepare(`
    SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
    FROM internships
    WHERE id = ?
  `).get(id);

  return formatInternship(row);
}

/**
 * Creates a new internship record.
 * Throws an error with statusCode: 409 if duplicate ID is encountered.
 * @param {object} data
 * @param {import('better-sqlite3').Database} [db]
 */
function createInternship(data, db = getDb()) {
  const trimmedId = data.id.trim();

  const existing = db.prepare('SELECT id FROM internships WHERE id = ?').get(trimmedId);
  if (existing) {
    const error = new Error(`Internship with ID '${trimmedId}' already exists`);
    error.statusCode = 409;
    error.errors = [
      { field: 'id', message: `Internship with ID '${trimmedId}' already exists` }
    ];
    throw error;
  }

  const sanitizedSkills = data.skills.map((s) => s.trim());

  db.prepare(`
    INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    trimmedId,
    data.title.trim(),
    data.domain.trim(),
    data.mode.trim(),
    data.location.trim(),
    JSON.stringify(sanitizedSkills),
    Number(data.openings)
  );

  return getInternshipById(trimmedId, db);
}

/**
 * Updates an existing internship record.
 * @param {string} id
 * @param {object} data
 * @param {import('better-sqlite3').Database} [db]
 */
function updateInternship(id, data, db = getDb()) {
  const existing = db.prepare('SELECT id FROM internships WHERE id = ?').get(id);
  if (!existing) {
    return null;
  }

  const sanitizedSkills = data.skills.map((s) => s.trim());

  db.prepare(`
    UPDATE internships
    SET title = ?, domain = ?, mode = ?, location = ?, skills = ?, openings = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.title.trim(),
    data.domain.trim(),
    data.mode.trim(),
    data.location.trim(),
    JSON.stringify(sanitizedSkills),
    Number(data.openings),
    id
  );

  return getInternshipById(id, db);
}

/**
 * Deletes an internship by ID.
 * @param {string} id
 * @param {import('better-sqlite3').Database} [db]
 * @returns {boolean} True if record was deleted, false if record was not found
 */
function deleteInternship(id, db = getDb()) {
  const existing = db.prepare('SELECT id FROM internships WHERE id = ?').get(id);
  if (!existing) {
    return false;
  }

  db.prepare('DELETE FROM internships WHERE id = ?').run(id);
  return true;
}

/**
 * Health check helper querying SQLite.
 * @param {import('better-sqlite3').Database} [db]
 * @returns {boolean}
 */
function checkDatabaseHealth(db = getDb()) {
  try {
    const res = db.prepare('SELECT 1 AS healthy').get();
    return !!(res && res.healthy === 1);
  } catch {
    return false;
  }
}

module.exports = {
  formatInternship,
  listInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  checkDatabaseHealth
};
