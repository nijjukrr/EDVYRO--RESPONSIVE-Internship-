/**
 * Central API and hosting environment configuration for InternBoard.
 *
 * Environment detection rules:
 * 1. Explicit override via window.__API_BASE_URL__ or localStorage 'INTERNBOARD_API_URL'
 * 2. GitHub Pages static hosting (*.github.io) -> no backend API (null), uses static dataset
 * 3. Backend-served origin (port 5000) -> relative '/api'
 * 4. Local frontend dev (localhost / 127.0.0.1 on non-5000 port) -> 'http://localhost:5000/api'
 * 5. Other custom hosts -> relative '/api'
 */

const DEFAULT_GH_PAGES_REPO_BASE = '/EDVYRO--RESPONSIVE-Internship-';

/**
 * Normalizes a base URL by stripping trailing slashes.
 * @param {string} url
 * @returns {string}
 */
function normalizeBaseUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Checks whether an explicit custom API base URL has been configured.
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
 * Resolves the active backend API base URL, or null when running in static-only GitHub Pages mode.
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
 * Returns the full URL for a given API endpoint, or null when running in static-only mode.
 * @param {string} endpoint - Endpoint path (e.g. '/internships' or '/applications')
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {string | null}
 */
export function getApiEndpoint(endpoint, loc = typeof window !== 'undefined' ? window.location : undefined) {
  const base = getApiBaseUrl(loc);
  if (!base) {
    return null;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanPath}`;
}
