const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const { getDbMode, buildPgPoolConfig } = require('../src/config/database');
const internshipService = require('../src/services/internshipService');
const applicationService = require('../src/services/applicationService');
const { seedPostgresDatabase } = require('../database/seed');
const { errorHandler } = require('../src/middleware/errorHandler');
const {
  readSqliteSource,
  normalizeSqliteTimestamp
} = require('../scripts/migrate-sqlite-to-postgres');

/**
 * Lightweight in-memory PostgreSQL Pool emulator supporting parameterized $1..$n queries
 * for deterministic CI verification without external database secrets.
 */
function createFakePgPool() {
  const internships = new Map();
  const applications = new Map();

  function assertParamsValid(params) {
    for (const p of params) {
      if (p === undefined) {
        throw new Error('Query parameter must not be undefined');
      }
    }
  }

  return {
    internships,
    applications,
    async query(sql, params = []) {
      assertParamsValid(params);
      const q = sql.replace(/\s+/g, ' ').trim();

      if (q === 'SELECT 1 AS healthy' || q === 'SELECT 1 AS ok') {
        return { rows: [{ healthy: 1, ok: 1 }], rowCount: 1 };
      }

      if (q.startsWith('SELECT COUNT(*)::int AS total FROM internships')) {
        return { rows: [{ total: internships.size }], rowCount: 1 };
      }

      if (q.startsWith('SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at FROM internships ORDER BY')) {
        const [limit, offset] = params;
        const sorted = [...internships.values()].sort(
          (a, b) => a.created_at.getTime() - b.created_at.getTime() || a.id.localeCompare(b.id)
        );
        const rows = sorted.slice(Number(offset), Number(offset) + Number(limit));
        return { rows, rowCount: rows.length };
      }

      if (q === 'SELECT id, title, domain, mode, location, skills, openings, created_at, updated_at FROM internships WHERE id = $1') {
        const row = internships.get(params[0]);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }

      if (q === 'SELECT id FROM internships WHERE id = $1') {
        const row = internships.get(params[0]);
        return { rows: row ? [{ id: row.id }] : [], rowCount: row ? 1 : 0 };
      }

      if (q === 'SELECT id, title FROM internships WHERE id = $1') {
        const row = internships.get(params[0]);
        return { rows: row ? [{ id: row.id, title: row.title }] : [], rowCount: row ? 1 : 0 };
      }

      if (q.startsWith('INSERT INTO internships')) {
        const [id, title, domain, mode, location, skillsJson, openings] = params;
        if (internships.has(id)) {
          if (q.includes('ON CONFLICT (id) DO NOTHING')) {
            return { rows: [], rowCount: 0 };
          }
          const dupErr = new Error('duplicate key value violates unique constraint');
          dupErr.code = '23505';
          throw dupErr;
        }
        const now = new Date();
        const row = {
          id,
          title,
          domain,
          mode,
          location,
          skills: JSON.parse(skillsJson),
          openings: Number(openings),
          created_at: now,
          updated_at: now
        };
        internships.set(id, row);
        return { rows: q.includes('RETURNING') ? [row] : [], rowCount: 1 };
      }

      if (q.startsWith('UPDATE internships SET')) {
        const [title, domain, mode, location, skillsJson, openings, id] = params;
        const existing = internships.get(id);
        if (!existing) {
          return { rows: [], rowCount: 0 };
        }
        const updated = {
          ...existing,
          title,
          domain,
          mode,
          location,
          skills: JSON.parse(skillsJson),
          openings: Number(openings),
          updated_at: new Date()
        };
        internships.set(id, updated);
        return { rows: [updated], rowCount: 1 };
      }

      if (q === 'DELETE FROM internships WHERE id = $1') {
        const id = params[0];
        if (!internships.has(id)) {
          return { rows: [], rowCount: 0 };
        }
        const hasChildApp = [...applications.values()].some((a) => a.internship_id === id);
        if (hasChildApp) {
          const fkErr = new Error('update or delete on table "internships" violates foreign key constraint');
          fkErr.code = '23503';
          throw fkErr;
        }
        internships.delete(id);
        return { rows: [], rowCount: 1 };
      }

      if (q === 'SELECT id FROM applications WHERE internship_id = $1 AND lower(email) = $2') {
        const [internshipId, emailLower] = params;
        const found = [...applications.values()].find(
          (a) => a.internship_id === internshipId && a.email.toLowerCase() === emailLower
        );
        return { rows: found ? [{ id: found.id }] : [], rowCount: found ? 1 : 0 };
      }

      if (q.startsWith('INSERT INTO applications')) {
        const [id, internshipId, fullName, email, portfolioUrl, coverLetter] = params;
        if (!internships.has(internshipId)) {
          const fkErr = new Error('violates foreign key constraint');
          fkErr.code = '23503';
          throw fkErr;
        }
        const dup = [...applications.values()].find(
          (a) => a.internship_id === internshipId && a.email.toLowerCase() === email.toLowerCase()
        );
        if (dup) {
          const dupErr = new Error('duplicate key value violates unique constraint');
          dupErr.code = '23505';
          throw dupErr;
        }
        const now = new Date();
        const row = {
          id,
          internship_id: internshipId,
          full_name: fullName,
          email,
          portfolio_url: portfolioUrl,
          cover_letter: coverLetter,
          created_at: now,
          updated_at: now
        };
        applications.set(id, row);
        return { rows: [row], rowCount: 1 };
      }

      throw new Error(`Unhandled query in test fake PG pool: ${q}`);
    }
  };
}

describe('InternBoard Stage 2 — PostgreSQL Mode, Services, Error Mapping & Migration Safety', () => {
  describe('Database Mode & SSL Pool Configuration', () => {
    it('strictly refuses SQLite fallback when NODE_ENV=production and DATABASE_URL is missing', () => {
      const prevEnv = process.env.NODE_ENV;
      const prevUrl = process.env.DATABASE_URL;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;
        assert.throws(() => getDbMode(), /DATABASE_URL is required when NODE_ENV=production/);

        process.env.DATABASE_URL = 'postgresql://user:pass@ep-demo.aws.neon.tech/neondb?sslmode=require';
        assert.equal(getDbMode(), 'postgres');

        process.env.NODE_ENV = 'test';
        delete process.env.DATABASE_URL;
        assert.equal(getDbMode(), 'sqlite');
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = prevUrl;
      }
    });

    it('enables SSL automatically for remote PostgreSQL URLs without explicit sslmode while keeping localhost compatible', () => {
      const remoteNoParam = buildPgPoolConfig('postgresql://user:pass@db.example.com/neondb');
      assert.deepEqual(remoteNoParam.ssl, { rejectUnauthorized: true });

      const localCfg = buildPgPoolConfig('postgresql://postgres:postgres@localhost:5432/internboard');
      assert.equal(localCfg.ssl, undefined);
    });
  });

  describe('PostgreSQL Service Operations & JSONB Serialization', () => {
    it('supports idempotent PG seeding, CRUD, JSONB skills arrays, FK enforcement, and health checks', async () => {
      const pool = createFakePgPool();

      const seed1 = await seedPostgresDatabase(pool);
      assert.equal(seed1.inserted, 5);
      assert.equal(seed1.existing, 0);

      const seed2 = await seedPostgresDatabase(pool);
      assert.equal(seed2.inserted, 0);
      assert.equal(seed2.existing, 5);

      const listed = await internshipService.listInternships({ page: 1, limit: 10, db: pool });
      assert.equal(listed.data.length, 5);
      assert.ok(Array.isArray(listed.data[0].skills));
      assert.equal(typeof listed.data[0].created_at, 'string');

      const created = await internshipService.createInternship(
        {
          id: 'INT-PG-1',
          title: 'Cloud Intern',
          domain: 'DevOps',
          mode: 'Remote',
          location: 'India',
          skills: ['Docker', 'PostgreSQL'],
          openings: 2
        },
        pool
      );
      assert.equal(created.id, 'INT-PG-1');
      assert.deepEqual(created.skills, ['Docker', 'PostgreSQL']);

      await assert.rejects(
        () =>
          internshipService.createInternship(
            {
              id: 'INT-PG-1',
              title: 'Duplicate',
              domain: 'DevOps',
              mode: 'Remote',
              location: 'India',
              skills: ['Docker'],
              openings: 1
            },
            pool
          ),
        (err) => err.statusCode === 409
      );

      const updated = await internshipService.updateInternship(
        'INT-PG-1',
        {
          title: 'Cloud & DB Intern',
          domain: 'DevOps',
          mode: 'Hybrid',
          location: 'Bengaluru',
          skills: ['Docker', 'PostgreSQL', 'Node.js'],
          openings: 3
        },
        pool
      );
      assert.equal(updated.openings, 3);
      assert.equal(updated.skills.length, 3);

      // Submit valid application + verify duplicate rejection + FK delete restriction
      const appCreated = await applicationService.createApplication(
        {
          internshipId: 'INT-PG-1',
          fullName: 'Riya Verma',
          email: 'Riya.Verma@Example.com',
          portfolioUrl: 'https://github.com/riya-verma',
          coverLetter: 'Excited about PostgreSQL and cloud automation.'
        },
        pool
      );
      assert.ok(appCreated.id.startsWith('APP-'));
      assert.equal(appCreated.email, 'riya.verma@example.com');
      assert.equal(appCreated.portfolioUrl, 'https://github.com/riya-verma');

      await assert.rejects(
        () =>
          applicationService.createApplication(
            {
              internshipId: 'INT-PG-1',
              fullName: 'Riya Verma',
              email: 'riya.verma@example.com'
            },
            pool
          ),
        (err) => err.statusCode === 409
      );

      await assert.rejects(
        () =>
          applicationService.createApplication(
            {
              internshipId: 'INT-DOES-NOT-EXIST',
              fullName: 'Test Candidate',
              email: 'test@example.com'
            },
            pool
          ),
        (err) => err.statusCode === 404
      );

      // Foreign key prevents deleting internship referenced by applications
      await assert.rejects(
        () => internshipService.deleteInternship('INT-PG-1', pool),
        (err) => err.code === '23503'
      );

      const deletedUnused = await internshipService.deleteInternship('INT-105', pool);
      assert.equal(deletedUnused, true);
      assert.equal(await internshipService.checkDatabaseHealth(pool), true);
    });
  });

  describe('PostgreSQL Error Handler Mapping', () => {
    it('maps PostgreSQL SQLSTATE codes cleanly without leaking raw SQL or stack traces', () => {
      const makeRes = () => {
        const res = {
          statusCode: null,
          body: null,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            this.body = payload;
            return this;
          }
        };
        return res;
      };

      const req = { method: 'POST', originalUrl: '/api/applications' };

      const res23505 = makeRes();
      errorHandler({ code: '23505', message: 'duplicate key raw detail' }, req, res23505, () => {});
      assert.equal(res23505.statusCode, 409);
      assert.equal(res23505.body.status, 'error');
      assert.ok(!res23505.body.message.includes('raw detail'));

      const res23503 = makeRes();
      errorHandler({ code: '23503', message: 'fk detail' }, req, res23503, () => {});
      assert.equal(res23503.statusCode, 409);

      const res22P02 = makeRes();
      errorHandler({ code: '22P02', message: 'invalid input syntax' }, req, res22P02, () => {});
      assert.equal(res22P02.statusCode, 400);
    });
  });

  describe('Migration Utility Safety & Legacy SQLite Compatibility', () => {
    it('reads legacy SQLite applications readonly without failing when portfolio_url column is absent', () => {
      const tmpDbPath = path.join(
        os.tmpdir(),
        `legacy-migr-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
      );
      const db = new Database(tmpDbPath);
      try {
        db.exec(`
          CREATE TABLE internships (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, domain TEXT NOT NULL,
            mode TEXT NOT NULL, location TEXT NOT NULL, skills TEXT NOT NULL,
            openings INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          CREATE TABLE applications (
            id TEXT PRIMARY KEY, internship_id TEXT NOT NULL, full_name TEXT NOT NULL,
            email TEXT NOT NULL, cover_letter TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          INSERT INTO internships VALUES ('INT-101','Frontend Intern','Full Stack Development','Remote','India','["HTML"]',3,'2026-11-25 07:00:00','2026-11-25 07:00:00');
          INSERT INTO applications VALUES ('APP-1','INT-101','Test User','test@example.com','Hi','2026-11-25 07:36:44','2026-11-25 07:36:44');
        `);
        db.close();

        const source = readSqliteSource(tmpDbPath);
        assert.equal(source.internships.length, 1);
        assert.equal(source.applications.length, 1);
        assert.equal(source.applications[0].id, 'APP-1');
        assert.equal(source.applications[0].portfolio_url, null);
        assert.equal(normalizeSqliteTimestamp(source.applications[0].created_at), '2026-11-25T07:36:44Z');
      } finally {
        for (const ext of ['', '-wal', '-shm']) {
          if (fs.existsSync(tmpDbPath + ext)) {
            fs.unlinkSync(tmpDbPath + ext);
          }
        }
      }
    });
  });
});
