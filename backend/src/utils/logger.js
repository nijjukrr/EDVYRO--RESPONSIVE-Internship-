/**
 * Structured, privacy-safe operational logger for InternBoard API.
 * Strictly avoids logging passwords, tokens, API keys, full request bodies,
 * applicant emails, applicant names, or cover letter content.
 */

const SENSITIVE_KEYS = new Set([
  'email',
  'fullName',
  'full_name',
  'coverLetter',
  'cover_letter',
  'password',
  'token',
  'accessToken',
  'authorization',
  'secret',
  'apiKey',
  'api_key'
]);

/**
 * Sanitizes metadata objects to prevent accidental PII or secret leakage.
 * @param {Record<string, unknown>} [meta]
 * @returns {Record<string, unknown>}
 */
function sanitizeMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  const safe = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key)) {
      safe[key] = '[REDACTED]';
    } else if (value instanceof Error) {
      safe[key] = value.message;
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Emits a structured log line at the specified level.
 * Suppressed during NODE_ENV=test unless LOG_IN_TEST=true.
 * @param {'INFO' | 'WARN' | 'ERROR'} level
 * @param {string} event
 * @param {Record<string, unknown>} [meta]
 */
function writeLog(level, event, meta = {}) {
  if (process.env.NODE_ENV === 'test' && process.env.LOG_IN_TEST !== 'true') {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeMeta(meta)
  };

  const line = JSON.stringify(entry);
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  info: (event, meta) => writeLog('INFO', event, meta),
  warn: (event, meta) => writeLog('WARN', event, meta),
  error: (event, meta) => writeLog('ERROR', event, meta),
  sanitizeMeta
};

module.exports = {
  logger,
  sanitizeMeta
};
