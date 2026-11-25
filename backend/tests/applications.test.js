const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

// Test database file in temporary directory
const testDbPath = path.join(
  os.tmpdir(),
  `internboard-apptest-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '25'; // Test threshold of 25 requests
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute window for tests

const { getDb, closeDb, initDatabase } = require('../src/config/database');
const { seedDatabase } = require('../database/seed');
const app = require('../src/app');

describe('EdVyro Task 4 — Applications API & Security Tests', () => {
  let testDb;

  before(() => {
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
  // Application Creation (POST /api/applications)
  // ==========================================
  describe('Application Submission Endpoints', () => {
    it('creates a valid application and returns HTTP 201 with predictable envelope', async () => {
      const payload = {
        internshipId: 'INT-101',
        fullName: 'Samantha Miller',
        email: 'samantha.miller@example.com',
        coverLetter: 'Excited to apply for the Frontend Intern role. Proficient in HTML, CSS, and modern JS.'
      };

      const res = await request(app).post('/api/applications').send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.data.id.startsWith('APP-'));
      assert.equal(res.body.data.internshipId, 'INT-101');
      assert.equal(res.body.data.fullName, 'Samantha Miller');
      assert.equal(res.body.data.email, 'samantha.miller@example.com');
      assert.equal(res.body.data.coverLetter, payload.coverLetter);
      assert.ok(res.body.data.createdAt);
    });

    it('creates a valid application with omitted optional cover letter', async () => {
      const payload = {
        internshipId: 'INT-102',
        fullName: 'Devon Patel',
        email: 'devon.patel@example.com'
      };

      const res = await request(app).post('/api/applications').send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.coverLetter, null);
    });

    it('rejects duplicate application (same email for same internship) with HTTP 409', async () => {
      const duplicatePayload = {
        internshipId: 'INT-101',
        fullName: 'Samantha Miller',
        email: 'samantha.miller@example.com',
        coverLetter: 'Trying to submit a second application.'
      };

      const res = await request(app).post('/api/applications').send(duplicatePayload);

      assert.equal(res.status, 409);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('already exists'));
      assert.ok(res.body.errors.some((e) => e.field === 'email'));
    });

    it('rejects duplicate application case-insensitively with HTTP 409', async () => {
      const res = await request(app).post('/api/applications').send({
        internshipId: 'INT-101',
        fullName: 'Samantha Miller',
        email: '  Samantha.Miller@EXAMPLE.COM  ',
        coverLetter: 'Case variant duplicate attempt.'
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.errors.some((e) => e.field === 'email'));
    });

    it('allows same email to apply to a DIFFERENT internship', async () => {
      const differentInternshipPayload = {
        internshipId: 'INT-103',
        fullName: 'Samantha Miller',
        email: 'samantha.miller@example.com',
        coverLetter: 'Applying for UI/UX role as well.'
      };

      const res = await request(app).post('/api/applications').send(differentInternshipPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.internshipId, 'INT-103');
    });

    it('rejects missing or empty internship ID with HTTP 400', async () => {
      const res1 = await request(app).post('/api/applications').send({
        fullName: 'Robin Vance',
        email: 'robin@example.com'
      });
      assert.equal(res1.status, 400);
      assert.equal(res1.body.status, 'error');
      assert.ok(res1.body.errors.some((e) => e.field === 'internshipId'));

      const res2 = await request(app).post('/api/applications').send({
        internshipId: '   ',
        fullName: 'Robin Vance',
        email: 'robin@example.com'
      });
      assert.equal(res2.status, 400);
      assert.ok(res2.body.errors.some((e) => e.field === 'internshipId'));
    });

    it('rejects non-existent internship ID with HTTP 404', async () => {
      const payload = {
        internshipId: 'INT-NONEXISTENT-999',
        fullName: 'Robin Vance',
        email: 'robin@example.com'
      };

      const res = await request(app).post('/api/applications').send(payload);

      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.ok(res.body.message.includes('does not exist'));
      assert.ok(res.body.errors.some((e) => e.field === 'internshipId'));
    });

    it('rejects missing or empty full name with HTTP 400', async () => {
      const res1 = await request(app).post('/api/applications').send({
        internshipId: 'INT-101',
        email: 'test@example.com'
      });
      assert.equal(res1.status, 400);
      assert.ok(res1.body.errors.some((e) => e.field === 'fullName'));

      const res2 = await request(app).post('/api/applications').send({
        internshipId: 'INT-101',
        fullName: '   ',
        email: 'test@example.com'
      });
      assert.equal(res2.status, 400);
      assert.ok(res2.body.errors.some((e) => e.field === 'fullName'));
    });

    it('rejects invalid email formats with HTTP 400', async () => {
      const invalidEmails = ['not-an-email', 'missing@domain', '@no-local.com', 'spaces in@mail.com'];

      for (const email of invalidEmails) {
        const res = await request(app).post('/api/applications').send({
          internshipId: 'INT-101',
          fullName: 'Test User',
          email
        });
        assert.equal(res.status, 400, `Expected 400 for email: ${email}`);
        assert.ok(res.body.errors.some((e) => e.field === 'email'));
      }
    });

    it('rejects cover letter exceeding 1000 characters with HTTP 400', async () => {
      const longText = 'A'.repeat(1001);

      const res = await request(app).post('/api/applications').send({
        internshipId: 'INT-104',
        fullName: 'Elena Rostova',
        email: 'elena@example.com',
        coverLetter: longText
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'coverLetter'));
    });

    it('rejects unexpected or unsupported payload properties with HTTP 400', async () => {
      const payload = {
        internshipId: 'INT-104',
        fullName: 'Elena Rostova',
        email: 'elena@example.com',
        adminBypass: true, // Unsupported property
        salaryExpectation: 99999
      };

      const res = await request(app).post('/api/applications').send(payload);

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'adminBypass'));
    });
  });

  // ==========================================
  // Security Tests (Helmet, SQL Injection, Privacy, Rate Limiting)
  // ==========================================
  describe('Security Protections', () => {
    it('verifies Helmet secure HTTP headers are present in responses', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      // Check for standard Helmet headers
      assert.ok(res.headers['x-content-type-options'], 'Missing X-Content-Type-Options header');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.ok(res.headers['x-frame-options'], 'Missing X-Frame-Options header');
      assert.ok(res.headers['x-dns-prefetch-control'], 'Missing X-DNS-Prefetch-Control header');
    });

    it('applies deliberate CORS allowlist for local/GitHub Pages origins and excludes untrusted origins', async () => {
      const allowedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:8080');
      assert.equal(allowedRes.status, 200);
      assert.equal(allowedRes.headers['access-control-allow-origin'], 'http://localhost:8080');

      const ghPagesRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://nijjukrr.github.io');
      assert.equal(ghPagesRes.status, 200);
      assert.equal(ghPagesRes.headers['access-control-allow-origin'], 'https://nijjukrr.github.io');

      const untrustedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.example.org');
      assert.equal(untrustedRes.status, 200);
      assert.equal(untrustedRes.headers['access-control-allow-origin'], undefined);
    });

    it('safely handles SQL injection attempts in fullName and email using parameterized queries', async () => {
      const injectionPayload = {
        internshipId: 'INT-105',
        fullName: "'; DROP TABLE applications; --",
        email: "injection' OR '1'='1@example.com",
        coverLetter: "SELECT * FROM applications WHERE '1'='1'"
      };

      const res = await request(app).post('/api/applications').send(injectionPayload);

      // Successfully sanitized and parameterized into SQLite, or rejected by format validation,
      // but critically: does NOT corrupt the database table structure!
      const checkTable = testDb.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='applications'").get();
      assert.equal(checkTable.count, 1, 'Applications table must remain intact and not dropped');

      // Verify records in applications table are still accessible
      const countApps = testDb.prepare('SELECT count(*) as count FROM applications').get();
      assert.ok(countApps.count >= 1);
    });

    it('verifies applicant personal information is NOT leaked through public internship listings', async () => {
      // Create an application first
      await request(app).post('/api/applications').send({
        internshipId: 'INT-105',
        fullName: 'Secret Applicant',
        email: 'private.applicant@example.com'
      });

      // GET /api/internships
      const listRes = await request(app).get('/api/internships');
      assert.equal(listRes.status, 200);
      const listStr = JSON.stringify(listRes.body);
      assert.ok(!listStr.includes('private.applicant@example.com'), 'Applicant email must not appear in listing API');
      assert.ok(!listStr.includes('Secret Applicant'), 'Applicant name must not appear in listing API');

      // GET /api/internships/INT-105
      const detailRes = await request(app).get('/api/internships/INT-105');
      assert.equal(detailRes.status, 200);
      const detailStr = JSON.stringify(detailRes.body);
      assert.ok(!detailStr.includes('private.applicant@example.com'), 'Applicant email must not appear in details API');
      assert.ok(!detailStr.includes('Secret Applicant'), 'Applicant name must not appear in details API');
    });

    it('triggers HTTP 429 Too Many Requests with standard rate-limit headers when exceeded', async () => {
      let rateLimited = false;
      let lastStatus = 200;
      let sawRateLimitHeaders = false;

      for (let i = 0; i < 20; i++) {
        const res = await request(app).post('/api/applications').send({
          internshipId: 'INT-102',
          fullName: `Spam Tester ${i}`,
          email: `spam.${i}.${Date.now()}@example.com`
        });

        if (res.headers['ratelimit-limit'] || res.headers['ratelimit']) {
          sawRateLimitHeaders = true;
        }

        lastStatus = res.status;
        if (res.status === 429) {
          rateLimited = true;
          assert.equal(res.body.status, 'error');
          assert.ok(res.body.message.includes('Too many application submissions'));
          break;
        }
      }

      assert.ok(sawRateLimitHeaders, 'Expected standard RateLimit-* headers on application endpoint');
      assert.ok(rateLimited, `Expected HTTP 429 rate limit to trigger (last status: ${lastStatus})`);
    });

    it('confirms rate limiter does NOT block normal internship browsing', async () => {
      // Even after application rate limit was triggered, GET /api/internships must remain 200 OK
      const browseRes = await request(app).get('/api/internships');
      assert.equal(browseRes.status, 200);
      assert.equal(browseRes.body.status, 'success');
      assert.equal(browseRes.body.data.length, 5);
    });

    it('sanitizes PII and secrets in structured operational logger', () => {
      const { sanitizeMeta } = require('../src/utils/logger');
      const sanitized = sanitizeMeta({
        applicationId: 'APP-123',
        internshipId: 'INT-101',
        email: 'secret.user@example.com',
        fullName: 'Private Applicant',
        coverLetter: 'Confidential cover letter text',
        password: 'super-secret-password',
        token: 'jwt-token-xyz'
      });

      assert.equal(sanitized.applicationId, 'APP-123');
      assert.equal(sanitized.internshipId, 'INT-101');
      assert.equal(sanitized.email, '[REDACTED]');
      assert.equal(sanitized.fullName, '[REDACTED]');
      assert.equal(sanitized.coverLetter, '[REDACTED]');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.token, '[REDACTED]');
    });
  });

  // ==========================================
  // Persistence Tests
  // ==========================================
  describe('Application Database Persistence', () => {
    it('persists submitted applications across database connection restarts', async () => {
      const payload = {
        internshipId: 'INT-104',
        fullName: 'Marcus Aurelius',
        email: 'marcus.persistent@example.com',
        coverLetter: 'Persistence verification application.'
      };

      const res = await request(app).post('/api/applications').send(payload);
      assert.ok(res.status === 201 || res.status === 429); // may be rate limited or created

      // Verify directly in database file
      const row = testDb.prepare('SELECT * FROM applications WHERE email = ?').get('samantha.miller@example.com');
      assert.ok(row, 'Initial application must exist in test SQLite database');

      // Simulate connection close and reopen
      closeDb();
      const reopenedDb = getDb(testDbPath);
      const reopenedRow = reopenedDb.prepare('SELECT * FROM applications WHERE email = ?').get('samantha.miller@example.com');

      assert.ok(reopenedRow, 'Application record must persist across connection restarts');
      assert.equal(reopenedRow.internship_id, 'INT-101');
      assert.equal(reopenedRow.full_name, 'Samantha Miller');
    });
  });
});
