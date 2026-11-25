/**
 * Central API and hosting environment configuration for InternBoard.
 *
 * Environment detection rules:
 * 1. Explicit override via window.__API_BASE_URL__, localStorage 'INTERNBOARD_API_URL',
 *    or <meta name="internboard-api-url" content="...">
 * 2. Production Render API constant (DEFAULT_PRODUCTION_API_URL) when set after deployment
 * 3. Backend-served origin (port 5000) -> relative '/api'
 * 4. Local frontend dev (localhost / 127.0.0.1 on non-5000 port) -> 'http://localhost:5000/api'
 * 5. GitHub Pages static hosting (*.github.io) without configured Render URL -> null (static fallback)
 * 6. Other custom hosts -> relative '/api'
 */

const DEFAULT_GH_PAGES_REPO_BASE = '/EDVYRO--RESPONSIVE-Internship-';

/**
 * Configure this to the deployed Render Web Service API URL (e.g. 'https://internboard-api.onrender.com/api')
 * once deployed, or set <meta name="internboard-api-url" content="..."> in index.html.
 */
export const DEFAULT_PRODUCTION_API_URL = '';

/**
 * Normalizes a base URL by stripping trailing slashes.
 * @param {string} url
 * @returns {string}
 */
function normalizeBaseUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Reads an optional API URL configured in <meta name="internboard-api-url">.
 * @returns {string | null}
 */
export function getMetaApiBaseUrl() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return null;
  }
  const meta = document.querySelector('meta[name="internboard-api-url"]');
  const content = meta?.getAttribute('content');
  if (typeof content === 'string' && content.trim()) {
    return normalizeBaseUrl(content);
  }
  return null;
}

/**
 * Checks whether an explicit custom or production API base URL has been configured.
 * @returns {string | null}
 */
export function getCustomApiBaseUrl() {
  if (typeof window !== 'undefined' && typeof window.__API_BASE_URL__ === 'string' && window.__API_BASE_URL__.trim()) {
    return normalizeBaseUrl(window.__API_BASE_URL__);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('INTERNBOARD_API_URL');
      if (saved && saved.trim()) {
        return normalizeBaseUrl(saved);
      }
    } catch {
      // Ignore storage access errors in restricted browser contexts
    }
  }

  const metaUrl = getMetaApiBaseUrl();
  if (metaUrl) {
    return metaUrl;
  }

  if (typeof DEFAULT_PRODUCTION_API_URL === 'string' && DEFAULT_PRODUCTION_API_URL.trim()) {
    return normalizeBaseUrl(DEFAULT_PRODUCTION_API_URL);
  }

  return null;
}

/**
 * Returns true if the current or supplied location is hosted on GitHub Pages.
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {boolean}
 */
export function isGitHubPagesHost(loc = typeof window !== 'undefined' ? window.location : undefined) {
  if (!loc || typeof loc.hostname !== 'string') {
    return false;
  }
  const host = loc.hostname.trim().toLowerCase();
  return host === 'nijjukrr.github.io' || host.endsWith('.github.io');
}

/**
 * Resolves the repository-relative static dataset path (`data/internships.json`).
 * Works reliably on GitHub Pages subpath hosting (with or without trailing slash) and locally.
 * @param {Location | { hostname?: string, pathname?: string }} [loc]
 * @returns {string}
 */
export function getStaticDatasetUrl(loc = typeof window !== 'undefined' ? window.location : undefined) {
  if (isGitHubPagesHost(loc)) {
    const pathname = typeof loc?.pathname === 'string' ? loc.pathname : '';
    const match = pathname.match(/^\/([^/]+)/);
    const repoBase = match ? `/${match[1]}` : DEFAULT_GH_PAGES_REPO_BASE;
    return `${repoBase}/data/internships.json`;
  }

  if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url.startsWith('http')) {
    try {
      return new URL('../data/internships.json', import.meta.url).href;
    } catch {
      // Fall through to relative path
    }
  }

  return './data/internships.json';
}

/**
 * Resolves the active backend API base URL, or null when static-only fallback applies.
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {string | null}
 */
export function getApiBaseUrl(loc = typeof window !== 'undefined' ? window.location : undefined) {
  const customUrl = getCustomApiBaseUrl();
  if (customUrl) {
    return customUrl;
  }

  if (isGitHubPagesHost(loc)) {
    return null;
  }

  if (loc && loc.port === '5000') {
    return '/api';
  }

  if (
    loc &&
    typeof loc.hostname === 'string' &&
    (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5000/api';
  }

  return '/api';
}

/**
 * Returns true if a backend API endpoint is configured/expected for the current environment.
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {boolean}
 */
export function isBackendAvailable(loc = typeof window !== 'undefined' ? window.location : undefined) {
  return getApiBaseUrl(loc) !== null;
}

/**
 * Resolves a full API endpoint URL, returning null when backend calls are disabled.
 * @param {string} path
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {string | null}
 */
export function getApiEndpoint(path, loc = typeof window !== 'undefined' ? window.location : undefined) {
  const baseUrl = getApiBaseUrl(loc);
  if (!baseUrl) {
    return null;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
