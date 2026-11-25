const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

// Test database file in temporary directory
const testDbPath = path.join(os.tmpdir(), `internboard-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { getDb, closeDb, initDatabase } = require('../src/config/database');
const { seedDatabase, OFFICIAL_INTERNSHIPS } = require('../database/seed');
const app = require('../src/app');

describe('EdVyro Task 3 — Internship REST API & SQLite Persistence', () => {
  let testDb;

  before(() => {
    // Initialize schema and seed official records into isolated test database
    testDb = getDb(testDbPath);
    initDatabase(testDb);
    seedDatabase(testDb);
  });

  after(() => {
    closeDb();
    if (testDb) {
      try {
        testDb.close();
      } catch {}
    }
    // Clean up temporary database files
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const p = `${testDbPath}${suffix}`;
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  });

  // ==========================================
  // Health & Root Endpoints
  // ==========================================
  describe('Health & Metadata', () => {
    it('GET /api/health returns HTTP 200 with api: running, database: connected', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.api, 'running');
      assert.equal(res.body.data.database, 'connected');
    });

    it('GET / returns root API index with status success', async () => {
      const res = await request(app).get('/');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.endpoints);
    });

    it('GET /api/unknown-endpoint returns HTTP 404 with error contract', async () => {
      const res = await request(app).get('/api/unknown-endpoint');

      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('not found'));
    });
  });

  // ==========================================
  // Read Tests (GET /api/internships)
  // ==========================================
  describe('Read Endpoints (GET)', () => {
    it('GET /api/internships returns all 5 seeded records by default', async () => {
      const res = await request(app).get('/api/internships');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 5);

      // Verify pagination contract
      assert.deepEqual(res.body.pagination, {
        page: 1,
        limit: 10,
        totalRecords: 5,
        totalPages: 1
      });

      // Verify all 5 official IDs are present
      const returnedIds = res.body.data.map((item) => item.id);
      for (const official of OFFICIAL_INTERNSHIPS) {
        assert.ok(returnedIds.includes(official.id), `Missing official ID ${official.id}`);
      }

      // Verify skills array is parsed
      assert.ok(Array.isArray(res.body.data[0].skills));
    });

    it('GET /api/internships?page=1&limit=2 returns first 2 records with correct pagination metadata', async () => {
      const res = await request(app).get('/api/internships?page=1&limit=2');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 2);
      assert.equal(res.body.pagination.totalRecords, 5);
      assert.equal(res.body.pagination.totalPages, 3);
    });

    it('GET /api/internships?page=3&limit=2 returns remaining 1 record on last page', async () => {
      const res = await request(app).get('/api/internships?page=3&limit=2');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.pagination.page, 3);
      assert.equal(res.body.pagination.limit, 2);
    });

    it('GET /api/internships?page=99&limit=10 returns empty array for out-of-range page', async () => {
      const res = await request(app).get('/api/internships?page=99&limit=10');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.length, 0);
      assert.equal(res.body.pagination.page, 99);
      assert.equal(res.body.pagination.totalRecords, 5);
    });

    it('GET /api/internships rejects non-integer or negative page with HTTP 400', async () => {
      const res1 = await request(app).get('/api/internships?page=0');
      assert.equal(res1.status, 400);
      assert.equal(res1.body.status, 'error');

      const res2 = await request(app).get('/api/internships?page=-3');
      assert.equal(res2.status, 400);

      const res3 = await request(app).get('/api/internships?page=abc');
      assert.equal(res3.status, 400);
    });

    it('GET /api/internships rejects limit > 100 with HTTP 400', async () => {
      const res = await request(app).get('/api/internships?limit=101');

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'limit'));
    });

    it('GET /api/internships/:id returns HTTP 200 and record for valid ID', async () => {
      const res = await request(app).get('/api/internships/INT-101');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.id, 'INT-101');
      assert.equal(res.body.data.title, 'Frontend Intern');
      assert.equal(res.body.data.domain, 'Full Stack Development');
      assert.equal(res.body.data.mode, 'Remote');
      assert.equal(res.body.data.location, 'India');
      assert.deepEqual(res.body.data.skills, ['HTML', 'CSS', 'JavaScript']);
      assert.equal(res.body.data.openings, 3);
    });

    it('GET /api/internships/:id returns HTTP 404 for nonexistent ID', async () => {
      const res = await request(app).get('/api/internships/INT-999');

      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('INT-999'));
    });
  });

  // ==========================================
  // Create Tests (POST /api/internships)
  // ==========================================
  describe('Create Endpoints (POST)', () => {
    it('POST /api/internships creates a new record successfully with HTTP 201', async () => {
      const payload = {
        id: 'INT-201',
        title: 'DevOps Engineering Intern',
        domain: 'Cloud Computing',
        mode: 'Remote',
        location: 'India',
        skills: ['Docker', 'Kubernetes', 'CI/CD'],
        openings: 2
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.id, 'INT-201');
      assert.equal(res.body.data.title, 'DevOps Engineering Intern');
      assert.equal(res.body.data.domain, 'Cloud Computing');
      assert.deepEqual(res.body.data.skills, ['Docker', 'Kubernetes', 'CI/CD']);
      assert.equal(res.body.data.openings, 2);

      // Verify record is retrievable via GET
      const getRes = await request(app).get('/api/internships/INT-201');
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.id, 'INT-201');
    });

    it('POST /api/internships rejects duplicate ID with HTTP 409', async () => {
      const payload = {
        id: 'INT-101',
        title: 'Duplicate Title',
        domain: 'Full Stack Development',
        mode: 'Remote',
        location: 'India',
        skills: ['HTML'],
        openings: 1
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 409);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('already exists'));
    });

    it('POST /api/internships rejects missing title with HTTP 400', async () => {
      const payload = {
        id: 'INT-202',
        domain: 'Engineering',
        mode: 'Remote',
        location: 'India',
        skills: ['Node.js'],
        openings: 1
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'title'));
    });

    it('POST /api/internships rejects missing domain with HTTP 400', async () => {
      const payload = {
        id: 'INT-203',
        title: 'Backend Intern',
        mode: 'Remote',
        location: 'India',
        skills: ['Node.js'],
        openings: 1
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'domain'));
    });

    it('POST /api/internships rejects invalid mode with HTTP 400', async () => {
      const payload = {
        id: 'INT-204',
        title: 'QA Intern',
        domain: 'Testing',
        mode: 'Everywhere', // Invalid mode
        location: 'India',
        skills: ['Selenium'],
        openings: 1
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'mode'));
    });

    it('POST /api/internships rejects invalid skills type (not an array) with HTTP 400', async () => {
      const payload = {
        id: 'INT-205',
        title: 'QA Intern',
        domain: 'Testing',
        mode: 'Remote',
        location: 'India',
        skills: 'HTML, CSS', // String instead of array
        openings: 1
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'skills'));
    });

    it('POST /api/internships rejects negative openings with HTTP 400', async () => {
      const payload = {
        id: 'INT-206',
        title: 'QA Intern',
        domain: 'Testing',
        mode: 'Remote',
        location: 'India',
        skills: ['Jest'],
        openings: -5
      };

      const res = await request(app).post('/api/internships').send(payload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'openings'));
    });

    it('POST /api/internships rejects malformed JSON with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/internships')
        .set('Content-Type', 'application/json')
        .send('{ "id": "INT-99", unquoted_key: }');

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('Invalid JSON'));
    });
  });

  // ==========================================
  // Update Tests (PUT /api/internships/:id)
  // ==========================================
  describe('Update Endpoints (PUT)', () => {
    it('PUT /api/internships/:id updates an existing record successfully with HTTP 200', async () => {
      const updatePayload = {
        title: 'Senior Frontend Intern',
        domain: 'Full Stack Development',
        mode: 'Remote',
        location: 'India & Global',
        skills: ['HTML5', 'CSS3', 'Modern JavaScript', 'TypeScript'],
        openings: 5
      };

      const res = await request(app).put('/api/internships/INT-101').send(updatePayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.id, 'INT-101');
      assert.equal(res.body.data.title, 'Senior Frontend Intern');
      assert.equal(res.body.data.location, 'India & Global');
      assert.deepEqual(res.body.data.skills, ['HTML5', 'CSS3', 'Modern JavaScript', 'TypeScript']);
      assert.equal(res.body.data.openings, 5);
    });

    it('PUT /api/internships/:id returns HTTP 404 for unknown ID', async () => {
      const updatePayload = {
        title: 'Does Not Matter',
        domain: 'Any',
        mode: 'Remote',
        location: 'Any',
        skills: ['Skill'],
        openings: 1
      };

      const res = await request(app).put('/api/internships/INT-NONEXISTENT').send(updatePayload);

      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('INT-NONEXISTENT'));
    });

    it('PUT /api/internships/:id rejects attempt to change ID with HTTP 400', async () => {
      const updatePayload = {
        id: 'DIFFERENT-ID',
        title: 'Attempt ID Change',
        domain: 'UI/UX',
        mode: 'Remote',
        location: 'India',
        skills: ['Figma'],
        openings: 1
      };

      const res = await request(app).put('/api/internships/INT-103').send(updatePayload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'id'));
    });

    it('PUT /api/internships/:id rejects missing required fields with HTTP 400', async () => {
      const invalidPayload = {
        title: 'Missing other fields'
      };

      const res = await request(app).put('/api/internships/INT-103').send(invalidPayload);

      assert.equal(res.status, 400);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.length > 0);
    });
  });

  // ==========================================
  // Delete Tests (DELETE /api/internships/:id)
  // ==========================================
  describe('Delete Endpoints (DELETE)', () => {
    it('DELETE /api/internships/:id deletes an existing record and returns HTTP 200', async () => {
      // Delete the record INT-201 created earlier
      const res = await request(app).delete('/api/internships/INT-201');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.message.includes('INT-201'));

      // Confirm record is no longer found
      const getRes = await request(app).get('/api/internships/INT-201');
      assert.equal(getRes.status, 404);
    });

    it('DELETE /api/internships/:id returns HTTP 404 when deleting an unknown ID', async () => {
      const res = await request(app).delete('/api/internships/INT-UNKNOWN-ID');

      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('INT-UNKNOWN-ID'));
    });
  });

  // ==========================================
  // Persistence Tests
  // ==========================================
  describe('SQLite Database Persistence', () => {
    it('persists newly created records across database connection restarts', async () => {
      // 1. Create a persistent test record via API
      const persistentRecord = {
        id: 'INT-PERSIST-1',
        title: 'Machine Learning Intern',
        domain: 'Artificial Intelligence',
        mode: 'Remote',
        location: 'India',
        skills: ['Python', 'PyTorch', 'NumPy'],
        openings: 4
      };

      const createRes = await request(app).post('/api/internships').send(persistentRecord);
      assert.equal(createRes.status, 201);

      // 2. Close active database connection to simulate server shutdown
      closeDb();

      // 3. Re-open connection pointing to the SAME SQLite database file without re-seeding
      const reopenedDb = getDb(testDbPath);
      const row = reopenedDb.prepare('SELECT * FROM internships WHERE id = ?').get('INT-PERSIST-1');

      assert.ok(row, 'Record must persist in the SQLite file after closing connection');
      assert.equal(row.id, 'INT-PERSIST-1');
      assert.equal(row.title, 'Machine Learning Intern');
      assert.equal(row.domain, 'Artificial Intelligence');
      assert.equal(row.openings, 4);

      // Clean up test record
      reopenedDb.prepare('DELETE FROM internships WHERE id = ?').run('INT-PERSIST-1');
    });
  });
});
