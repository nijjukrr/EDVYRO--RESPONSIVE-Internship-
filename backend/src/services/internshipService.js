const { getDb, getPgPool, getDbMode } = require('../config/database');

function formatTimestamp(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Normalizes a SQLite or PostgreSQL row into a consistent API internship object.
 * @param {object} row
 * @returns {object|null}
 */
function formatInternship(row) {
  if (!row) return null;

  let parsedSkills = [];
  if (Array.isArray(row.skills)) {
    parsedSkills = row.skills;
  } else {
    try {
      parsedSkills = typeof row.skills === 'string' ? JSON.parse(row.skills) : [];
    } catch {
      parsedSkills = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    mode: row.mode,
    location: row.location,
    skills: parsedSkills,
    openings: Number(row.openings),
    created_at: formatTimestamp(row.created_at),
    updated_at: formatTimestamp(row.updated_at)
  };
}

/**
 * Resolves database target: explicit SQLite DB, explicit PG Pool, or configured active engine.
 */
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

/**
 * Returns a paginated list of internships.
 */
async function listInternships({ page = 1, limit = 10, db } = {}) {
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  const target = resolveTarget(db);

  if (target.mode === 'postgres') {
    const countRes = await target.pool.query('SELECT COUNT(*)::int AS total FROM internships');
    const totalRecords = countRes.rows[0] ? Number(countRes.rows[0].total) : 0;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    const listRes = await target.pool.query(
      `SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
       FROM internships
       ORDER BY created_at ASC, id ASC
       LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    );

    return {
      data: listRes.rows.map(formatInternship),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages
      }
    };
  }

  const countRow = target.db.prepare('SELECT COUNT(*) AS total FROM internships').get();
  const totalRecords = countRow ? countRow.total : 0;
  const totalPages = Math.ceil(totalRecords / limitNum) || 1;

  const rows = target.db.prepare(`
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
 */
async function getInternshipById(id, db) {
  const target = resolveTarget(db);

  if (target.mode === 'postgres') {
    const res = await target.pool.query(
      `SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
       FROM internships
       WHERE id = $1`,
      [id]
    );
    return formatInternship(res.rows[0]);
  }

  const row = target.db.prepare(`
    SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at
    FROM internships
    WHERE id = ?
  `).get(id);

  return formatInternship(row);
}

function buildDuplicateIdError(trimmedId) {
  const error = new Error(`Internship with ID '${trimmedId}' already exists`);
  error.statusCode = 409;
  error.errors = [{ field: 'id', message: `Internship with ID '${trimmedId}' already exists` }];
  return error;
}

/**
 * Creates a new internship record.
 */
async function createInternship(data, db) {
  const trimmedId = data.id.trim();
  const sanitizedSkills = data.skills.map((s) => s.trim());
  const target = resolveTarget(db);

  if (target.mode === 'postgres') {
    const existing = await target.pool.query('SELECT id FROM internships WHERE id = $1', [trimmedId]);
    if (existing.rowCount > 0) {
      throw buildDuplicateIdError(trimmedId);
    }

    const res = await target.pool.query(
      `INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, domain, mode, location, skills, openings, created_at, updated_at`,
      [
        trimmedId,
        data.title.trim(),
        data.domain.trim(),
        data.mode.trim(),
        data.location.trim(),
        JSON.stringify(sanitizedSkills),
        Number(data.openings)
      ]
    );

    return formatInternship(res.rows[0]);
  }

  const existing = target.db.prepare('SELECT id FROM internships WHERE id = ?').get(trimmedId);
  if (existing) {
    throw buildDuplicateIdError(trimmedId);
  }

  target.db.prepare(`
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

  return getInternshipById(trimmedId, target.db);
}

/**
 * Updates an existing internship record.
 */
async function updateInternship(id, data, db) {
  const sanitizedSkills = data.skills.map((s) => s.trim());
  const target = resolveTarget(db);

  if (target.mode === 'postgres') {
    const res = await target.pool.query(
      `UPDATE internships
       SET title = $1, domain = $2, mode = $3, location = $4, skills = $5::jsonb, openings = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, title, domain, mode, location, skills, openings, created_at, updated_at`,
      [
        data.title.trim(),
        data.domain.trim(),
        data.mode.trim(),
        data.location.trim(),
        JSON.stringify(sanitizedSkills),
        Number(data.openings),
        id
      ]
    );
    return res.rowCount > 0 ? formatInternship(res.rows[0]) : null;
  }

  const existing = target.db.prepare('SELECT id FROM internships WHERE id = ?').get(id);
  if (!existing) {
    return null;
  }

  target.db.prepare(`
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

  return getInternshipById(id, target.db);
}

/**
 * Deletes an internship by ID.
 */
async function deleteInternship(id, db) {
  const target = resolveTarget(db);

  if (target.mode === 'postgres') {
    const res = await target.pool.query('DELETE FROM internships WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  const existing = target.db.prepare('SELECT id FROM internships WHERE id = ?').get(id);
  if (!existing) {
    return false;
  }

  target.db.prepare('DELETE FROM internships WHERE id = ?').run(id);
  return true;
}

/**
 * Health check helper verifying real connectivity to SQLite or PostgreSQL.
 */
async function checkDatabaseHealth(db) {
  try {
    const target = resolveTarget(db);
    if (target.mode === 'postgres') {
      const res = await target.pool.query('SELECT 1 AS healthy');
      return Boolean(res.rows && res.rows[0] && Number(res.rows[0].healthy) === 1);
    }
    const res = target.db.prepare('SELECT 1 AS healthy').get();
    return Boolean(res && res.healthy === 1);
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
