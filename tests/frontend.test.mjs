import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getApiBaseUrl,
  getApiEndpoint,
  getStaticDatasetUrl,
  isBackendAvailable,
  isGitHubPagesHost
} from '../js/config.js';
import { loadInternships, resolveDataSource } from '../js/data.js';
import { validateDataset, validateInternship } from '../js/validation.js';
import {
  applyAllFilters,
  filterByDomain,
  filterByWorkMode,
  getUniqueDomains,
  getUniqueWorkModes,
  searchInternships,
  sortInternships
} from '../js/filters.js';
import { validateApplicationClient } from '../js/application.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe('EdVyro Task 4 — Frontend Unit & Environment Tests', () => {
  describe('Environment Detection & GitHub Pages Routing (js/config.js)', () => {
    it('detects nijjukrr.github.io and *.github.io as GitHub Pages static hosts', () => {
      assert.equal(isGitHubPagesHost({ hostname: 'nijjukrr.github.io' }), true);
      assert.equal(isGitHubPagesHost({ hostname: 'example.github.io' }), true);
      assert.equal(isGitHubPagesHost({ hostname: 'localhost' }), false);
      assert.equal(isGitHubPagesHost({ hostname: '127.0.0.1' }), false);
    });

    it('returns null API base URL on GitHub Pages without custom override', () => {
      const ghLocation = {
        hostname: 'nijjukrr.github.io',
        pathname: '/EDVYRO--RESPONSIVE-Internship-/',
        port: ''
      };
      assert.equal(getApiBaseUrl(ghLocation), null);
      assert.equal(isBackendAvailable(ghLocation), false);
      assert.equal(getApiEndpoint('/internships', ghLocation), null);
      assert.equal(getApiEndpoint('/applications', ghLocation), null);
    });

    it('resolves repository-relative static dataset path on GitHub Pages (with or without trailing slash)', () => {
      assert.equal(
        getStaticDatasetUrl({
          hostname: 'nijjukrr.github.io',
          pathname: '/EDVYRO--RESPONSIVE-Internship-/'
        }),
        '/EDVYRO--RESPONSIVE-Internship-/data/internships.json'
      );
      assert.equal(
        getStaticDatasetUrl({
          hostname: 'nijjukrr.github.io',
          pathname: '/EDVYRO--RESPONSIVE-Internship-'
        }),
        '/EDVYRO--RESPONSIVE-Internship-/data/internships.json'
      );
    });

    it('routes local development to http://localhost:5000/api or /api on port 5000', () => {
      assert.equal(
        getApiBaseUrl({ hostname: 'localhost', port: '8080', pathname: '/' }),
        'http://localhost:5000/api'
      );
      assert.equal(
        getApiBaseUrl({ hostname: '127.0.0.1', port: '5500', pathname: '/' }),
        'http://localhost:5000/api'
      );
      assert.equal(
        getApiBaseUrl({ hostname: 'localhost', port: '5000', pathname: '/' }),
        '/api'
      );
      assert.equal(
        isBackendAvailable({ hostname: 'localhost', port: '8080', pathname: '/' }),
        true
      );
    });

    it('honors explicit window.__API_BASE_URL__ override even on GitHub Pages', () => {
      globalThis.window = {
        __API_BASE_URL__: 'https://api.internboard.example/v1/',
        location: {
          hostname: 'nijjukrr.github.io',
          pathname: '/EDVYRO--RESPONSIVE-Internship-/',
          port: ''
        }
      };
      assert.equal(getApiBaseUrl(globalThis.window.location), 'https://api.internboard.example/v1');
      assert.equal(
        getApiEndpoint('/applications', globalThis.window.location),
        'https://api.internboard.example/v1/applications'
      );
    });
  });

  describe('Official Dataset & Validation (data/internships.json, js/validation.js)', () => {
    it('preserves all 5 official EdVyro internship records without modifications', () => {
      const jsonPath = path.join(ROOT_DIR, 'data', 'internships.json');
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const { internships, warnings } = validateDataset(raw);

      assert.equal(warnings.length, 0);
      assert.equal(internships.length, 5);
      assert.deepEqual(
        internships.map((i) => i.id),
        ['INT-101', 'INT-102', 'INT-103', 'INT-104', 'INT-105']
      );
      assert.equal(
        internships.reduce((sum, i) => sum + i.openings, 0),
        9
      );
      assert.equal(getUniqueDomains(internships).length, 4);
      assert.equal(
        internships.filter((i) => i.mode === 'Remote').length,
        3
      );
    });

    it('supports valid empty API dataset array without throwing an error', () => {
      const result = validateDataset({ status: 'success', data: [] });
      assert.deepEqual(result.internships, []);
      assert.deepEqual(result.warnings, []);
    });

    it('rejects error envelopes and malformed datasets cleanly', () => {
      assert.throws(() => validateDataset({ status: 'error', message: 'DB failure' }), /DB failure/);
      assert.throws(() => validateDataset({ status: 'unknown', data: [] }), /Unexpected API response/);
      assert.throws(() => validateDataset({ invalid: true }), /Dataset format is invalid/);
      assert.throws(
        () => validateDataset([{ title: 'Missing required fields' }]),
        /No valid internship records/
      );
    });

    it('rejects unsafe URL protocols (javascript:, data:) and preserves https URLs', () => {
      const unsafe = validateInternship({
        id: 'INT-101',
        title: 'Frontend Intern',
        domain: 'Full Stack Development',
        mode: 'Remote',
        location: 'India',
        skills: ['HTML'],
        openings: 1,
        applicationUrl: 'javascript:alert(1)'
      });
      assert.equal(unsafe.valid, true);
      assert.equal(unsafe.internship.applicationUrl, null);

      const safe = validateInternship({
        id: 'INT-101',
        title: 'Frontend Intern',
        domain: 'Full Stack Development',
        mode: 'Remote',
        location: 'India',
        skills: ['HTML'],
        openings: 1,
        applicationUrl: 'https://example.com/apply'
      });
      assert.equal(safe.valid, true);
      assert.equal(safe.internship.applicationUrl, 'https://example.com/apply');
    });
  });

  describe('Two-Page Architecture & Monochrome Design Integrity', () => {
    it('verifies landing page links cleanly to ./internships/, removes logoipsum, and resolves dataset under /internships/', () => {
      const landingHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      assert.ok(landingHtml.includes('The Next Layer<br>of Intelligence'));
      assert.ok(landingHtml.includes('href="./internships/"'));
      assert.ok(landingHtml.includes('da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4'));
      assert.equal(/logoipsum/i.test(landingHtml), false, 'Landing page must not contain logoipsum text');

      const portalHtml = fs.readFileSync(path.join(ROOT_DIR, 'internships', 'index.html'), 'utf8');
      assert.ok(portalHtml.includes('src="../js/app.js"'));
      assert.ok(portalHtml.includes('href="../css/style.css"'));
      assert.ok(portalHtml.includes('id="theme-toggle"'));

      assert.equal(
        getStaticDatasetUrl({
          hostname: 'nijjukrr.github.io',
          pathname: '/EDVYRO--RESPONSIVE-Internship-/internships/'
        }),
        '/EDVYRO--RESPONSIVE-Internship-/data/internships.json'
      );
    });

    it('verifies monochrome & Watermelon Green+Black CSS contains zero leftover purple/indigo hex codes', () => {
      const css = fs.readFileSync(path.join(ROOT_DIR, 'css', 'style.css'), 'utf8');
      assert.equal(/#4f46e5|#4338ca|#eef2ff|#c7d2fe|#2563eb/i.test(css), false);
      assert.ok(css.includes('[data-theme="watermelon"]'));
      assert.ok(css.includes('#22c55e'));
    });
  });

  describe('Data Loader & Failure Handling (js/data.js)', () => {
    it('selects static dataset directly on GitHub Pages without calling /api/internships', async () => {
      globalThis.window = {
        location: {
          hostname: 'nijjukrr.github.io',
          pathname: '/EDVYRO--RESPONSIVE-Internship-/',
          port: ''
        }
      };

      const source = resolveDataSource();
      assert.equal(source.sourceType, 'static');
      assert.equal(source.url, '/EDVYRO--RESPONSIVE-Internship-/data/internships.json');

      const jsonRaw = fs.readFileSync(path.join(ROOT_DIR, 'data', 'internships.json'), 'utf8');
      const fetchedUrls = [];
      globalThis.fetch = async (url) => {
        fetchedUrls.push(url);
        return new Response(jsonRaw, { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      const result = await loadInternships();
      assert.deepEqual(fetchedUrls, ['/EDVYRO--RESPONSIVE-Internship-/data/internships.json']);
      assert.equal(result.sourceType, 'static');
      assert.equal(result.internships.length, 5);
    });

    it('handles HTTP 404, HTTP 500, empty body, invalid JSON, and network failures honestly', async () => {
      globalThis.fetch = async () => new Response('Not Found', { status: 404, statusText: 'Not Found' });
      await assert.rejects(() => loadInternships('http://localhost:5000/api/internships'), /HTTP 404/);

      globalThis.fetch = async () => new Response('Server Error', { status: 500, statusText: 'Internal Server Error' });
      await assert.rejects(() => loadInternships('http://localhost:5000/api/internships'), /HTTP 500/);

      globalThis.fetch = async () => new Response('', { status: 200 });
      await assert.rejects(() => loadInternships('http://localhost:5000/api/internships'), /empty response/);

      globalThis.fetch = async () => new Response('{not-valid-json', { status: 200 });
      await assert.rejects(() => loadInternships('http://localhost:5000/api/internships'), /invalid JSON/);

      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };
      await assert.rejects(
        () => loadInternships('http://localhost:5000/api/internships'),
        /Unable to connect to the internship API/
      );
    });
  });

  describe('Search, Filter & Sorting Utilities (js/filters.js)', () => {
    const sample = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'data', 'internships.json'), 'utf8')
    ).internships;

    it('searches case-insensitively across title, domain, skills, and location', () => {
      assert.equal(searchInternships(sample, '  figma ').length, 1);
      assert.equal(searchInternships(sample, 'SQL').length, 2);
      assert.equal(searchInternships(sample, 'pune')[0].id, 'INT-102');
    });

    it('filters by domain, work mode, and sorts accurately', () => {
      assert.equal(filterByDomain(sample, 'Full Stack Development').length, 2);
      assert.equal(filterByWorkMode(sample, 'Remote').length, 3);
      assert.deepEqual(getUniqueWorkModes(sample), ['Remote', 'Hybrid', 'On-site']);

      const sortedDesc = sortInternships(sample, 'openings-desc');
      assert.equal(sortedDesc[0].id, 'INT-101');
      assert.equal(sortedDesc[0].openings, 3);

      const combined = applyAllFilters(sample, {
        query: 'SQL',
        domain: 'Full Stack Development',
        mode: 'Hybrid',
        stipend: 'all',
        sortBy: 'default'
      });
      assert.equal(combined.length, 1);
      assert.equal(combined[0].id, 'INT-102');
    });
  });

  describe('Application Form Client Validation (js/application.js)', () => {
    it('rejects empty, whitespace-only, malformed emails, and oversized cover letters', () => {
      const missingRes = validateApplicationClient({
        internshipId: '',
        fullName: '   ',
        email: 'bad-email',
        coverLetter: 'x'.repeat(1001)
      });
      assert.equal(missingRes.isValid, false);
      assert.ok(missingRes.errors.internshipId);
      assert.ok(missingRes.errors.fullName);
      assert.ok(missingRes.errors.email);
      assert.ok(missingRes.errors.coverLetter);

      const validRes = validateApplicationClient({
        internshipId: 'INT-101',
        fullName: 'Aarav Mehta',
        email: 'aarav.mehta@example.com',
        coverLetter: 'Excited to contribute to the frontend team.'
      });
      assert.equal(validRes.isValid, true);
      assert.deepEqual(validRes.errors, {});
    });
  });
});
