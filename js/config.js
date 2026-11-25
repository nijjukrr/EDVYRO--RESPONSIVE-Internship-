/**
 * Central API configuration for InternBoard.
 * Allows configuring the backend API base URL via:
 * 1. window.__API_BASE_URL__ (runtime override)
 * 2. localStorage 'INTERNBOARD_API_URL' (browser preference)
 * 3. Default to local Express backend (http://localhost:5000/api) during local development
 * 4. Default to relative '/api' on custom domains
 */

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__.replace(/\/+$/, '');
  }

  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('INTERNBOARD_API_URL');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  if (typeof window !== 'undefined' && window.location.port === '5000') {
    return '/api';
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5000/api';
  }

  return '/api';
}

/**
 * Returns the full URL for a given API endpoint.
 * @param {string} endpoint - Endpoint path (e.g. '/internships' or '/applications')
 * @returns {string}
 */
export function getApiEndpoint(endpoint) {
  const base = getApiBaseUrl();
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanPath}`;
}
