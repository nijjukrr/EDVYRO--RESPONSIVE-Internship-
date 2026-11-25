const { getDb, getPgPool, getDbMode } = require('../src/config/database');

const OFFICIAL_INTERNSHIPS = [
  {
    id: 'INT-101',
    title: 'Frontend Intern',
    domain: 'Full Stack Development',
    mode: 'Remote',
    location: 'India',
    skills: ['HTML', 'CSS', 'JavaScript'],
    openings: 3
  },
  {
    id: 'INT-102',
    title: 'API Engineering Intern',
    domain: 'Full Stack Development',
    mode: 'Hybrid',
    location: 'Pune',
    skills: ['Node.js', 'SQL', 'Testing'],
    openings: 2
  },
  {
    id: 'INT-103',
    title: 'UI/UX Intern',
    domain: 'UI/UX',
    mode: 'Remote',
    location: 'India',
    skills: ['Figma', 'Research', 'Accessibility'],
    openings: 1
  },
  {
    id: 'INT-104',
    title: 'Data Analyst Intern',
    domain: 'Data Analytics',
    mode: 'On-site',
    location: 'Bengaluru',
    skills: ['Excel', 'SQL', 'Data visualisation'],
    openings: 2
  },
  {
    id: 'INT-105',
    title: 'Security Operations Intern',
    domain: 'Cyber Security',
    mode: 'Remote',
    location: 'India',
    skills: ['Linux', 'Logs', 'Networking'],
    openings: 1
  }
];

function seedSqlite(db) {
  const checkStmt = db.prepare('SELECT id FROM internships WHERE id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  let inserted = 0;
  let existing = 0;

  const insertTransaction = db.transaction((records) => {
    for (const record of records) {
      const found = checkStmt.get(record.id);
      if (found) {
        existing++;
      } else {
        insertStmt.run(
          record.id,
          record.title,
          record.domain,
          record.mode,
          record.location,
          JSON.stringify(record.skills),
          record.openings
        );
        inserted++;
      }
    }
  });

  insertTransaction(OFFICIAL_INTERNSHIPS);

  console.log(`[Seed] Completed: ${inserted} inserted, ${existing} already present (total: ${OFFICIAL_INTERNSHIPS.length}).`);
  return { inserted, existing, total: OFFICIAL_INTERNSHIPS.length };
}

async function seedPostgresDatabase(pool = getPgPool()) {
  let inserted = 0;
  let existing = 0;

  for (const record of OFFICIAL_INTERNSHIPS) {
    const res = await pool.query(
      `INSERT INTO internships (id, title, domain, mode, location, skills, openings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.title,
        record.domain,
        record.mode,
        record.location,
        JSON.stringify(record.skills),
        record.openings
      ]
    );
    if (res.rowCount > 0) {
      inserted++;
    } else {
      existing++;
    }
  }

  console.log(`[Seed] PostgreSQL completed: ${inserted} inserted, ${existing} already present (total: ${OFFICIAL_INTERNSHIPS.length}).`);
  return { inserted, existing, total: OFFICIAL_INTERNSHIPS.length };
}

/**
 * Seeds official internship records idempotently.
 * Runs synchronously when passed an SQLite DB or when in SQLite mode (preserving sync test hooks);
 * runs asynchronously when passed a pg Pool or when DATABASE_URL selects PostgreSQL mode.
 */
function seedDatabase(target) {
  if (target && typeof target.query === 'function') {
    return seedPostgresDatabase(target);
  }
  if (target) {
    return seedSqlite(target);
  }
  if (getDbMode() === 'postgres') {
    return seedPostgresDatabase(getPgPool());
  }
  return seedSqlite(getDb());
}

if (require.main === module) {
  Promise.resolve()
    .then(() => seedDatabase())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err.message);
      process.exit(1);
    });
}

module.exports = {
  OFFICIAL_INTERNSHIPS,
  seedDatabase,
  seedPostgresDatabase
};
