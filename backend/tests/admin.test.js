const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDbPath = path.join(
  os.tmpdir(),
  `internboard-admintest-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

const { getDb, closeDb, initDatabase } = require('../src/config/database');
const { seedDatabase } = require('../database/seed');
const { sha256Hex } = require('../src/middleware/adminAuth');
const app = require('../src/app');

describe('InternBoard Admin Authorization Security', () => {
  let testDb;
  const origEnv = process.env.NODE_ENV;
  const origToken = process.env.ADMIN_API_TOKEN;
  const origHash = process.env.ADMIN_API_KEY_HASH;

  before(() => {
    testDb = getDb(testDbPath);
    initDatabase(testDb);
    seedDatabase(testDb);
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    if (origToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = origToken;
    if (origHash === undefined) delete process.env.ADMIN_API_KEY_HASH;
    else process.env.ADMIN_API_KEY_HASH = origHash;
  });

  after(async () => {
    await closeDb();
    try { testDb.close(); } catch {}
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const p = `${testDbPath}${suffix}`;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  });

  it('rejects unauthenticated write attempts when ADMIN_API_KEY_HASH is configured and accepts valid Bearer/X-Admin-Token', async () => {
    const secret = 'test-admin-secret-rotate-in-prod';
    process.env.ADMIN_API_KEY_HASH = sha256Hex(secret);

    const payload = {
      id: 'INT-ADMIN-1',
      title: 'Platform Security Intern',
      domain: 'Cyber Security',
      mode: 'Remote',
      location: 'India',
      skills: ['Security', 'Node.js'],
      openings: 1
    };

    // Public GET remains accessible
    const publicGet = await request(app).get('/api/internships');
    assert.equal(publicGet.status, 200);

    // Unauthenticated POST -> 401
    const unauthPost = await request(app).post('/api/internships').send(payload);
    assert.equal(unauthPost.status, 401);

    // Wrong token -> 403
    const badAuthPost = await request(app)
      .post('/api/internships')
      .set('Authorization', 'Bearer wrong-token')
      .send(payload);
    assert.equal(badAuthPost.status, 403);

    // Valid Bearer token -> 201
    const okPost = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${secret}`)
      .send(payload);
    assert.equal(okPost.status, 201);

    // Unauthenticated PUT -> 401
    const unauthPut = await request(app)
      .put('/api/internships/INT-ADMIN-1')
      .send({ ...payload, openings: 2 });
    assert.equal(unauthPut.status, 401);

    // Valid X-Admin-Token -> 200
    const okPut = await request(app)
      .put('/api/internships/INT-ADMIN-1')
      .set('X-Admin-Token', secret)
      .send({ ...payload, openings: 2 });
    assert.equal(okPut.status, 200);
    assert.equal(okPut.body.data.openings, 2);

    // Unauthenticated DELETE -> 401
    const unauthDelete = await request(app).delete('/api/internships/INT-ADMIN-1');
    assert.equal(unauthDelete.status, 401);

    // Valid Bearer DELETE -> 200
    const okDelete = await request(app)
      .delete('/api/internships/INT-ADMIN-1')
      .set('Authorization', `Bearer ${secret}`);
    assert.equal(okDelete.status, 200);
  });

  it('fails closed in NODE_ENV=production if admin credentials are not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_API_TOKEN;
    delete process.env.ADMIN_API_KEY_HASH;

    const res = await request(app).delete('/api/internships/INT-101');
    assert.equal(res.status, 401);
    assert.equal(res.body.status, 'error');
  });
});
