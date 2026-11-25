/**
 * Central API and hosting environment configuration for InternBoard.
 *
 * Environment detection rules:
 * 1. Explicit runtime override via window.__API_BASE_URL__ or localStorage 'INTERNBOARD_API_URL'
 * 2. Local backend-served origin (port 5000) -> relative '/api'
 * 3. Local frontend dev (localhost / 127.0.0.1 on non-5000 port) -> 'http://localhost:5000/api'
 * 4. Configured production Render API URL (<meta name="internboard-api-url"> or DEFAULT_PRODUCTION_API_URL)
 * 5. GitHub Pages static hosting (*.github.io) without configured URL -> null (static fallback)
 * 6. Other custom hosts -> relative '/api'
 */

const DEFAULT_GH_PAGES_REPO_BASE = '/EDVYRO--RESPONSIVE-Internship-';

/**
 * Live Render Web Service API base URL for deployed static frontends (GitHub Pages).
 */
export const DEFAULT_PRODUCTION_API_URL = 'https://edvyro-responsive-internship.onrender.com/api';

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
 * Checks whether an explicit runtime override has been configured (window or localStorage).
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
 * Returns the configured production backend API base URL from <meta> or DEFAULT_PRODUCTION_API_URL.
 * @returns {string | null}
 */
export function getConfiguredProductionApiUrl() {
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
 * Returns true if the supplied location is a local development origin.
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {boolean}
 */
export function isLocalDevelopmentHost(loc = typeof window !== 'undefined' ? window.location : undefined) {
  if (!loc || typeof loc.hostname !== 'string') {
    return false;
  }
  const host = loc.hostname.trim().toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
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

  if (loc && loc.port === '5000') {
    return '/api';
  }

  if (isLocalDevelopmentHost(loc)) {
    return 'http://localhost:5000/api';
  }

  const productionUrl = getConfiguredProductionApiUrl();
  if (productionUrl) {
    return productionUrl;
  }

  if (isGitHubPagesHost(loc)) {
    return null;
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
