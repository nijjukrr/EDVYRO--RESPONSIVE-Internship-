const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_FIELDS = new Set(['internshipId', 'fullName', 'email', 'portfolioUrl', 'coverLetter']);
const MAX_PORTFOLIO_URL_LENGTH = 2048;

/** Accept only absolute HTTP(S) URLs without embedded credentials. */
function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_PORTFOLIO_URL_LENGTH) return false;
  if (/[\s\u0000-\u001F\u007F]/.test(value) || value.startsWith('//') || value.includes('\\')) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

/**
 * Validates request payload for submitting an internship application.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateCreateApplication(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }]
    };
  }

  // Reject unexpected or unsupported properties
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({
        field: key,
        message: `Unsupported property '${key}'`
      });
    }
  }

  // Internship ID validation
  if (body.internshipId === undefined || body.internshipId === null) {
    errors.push({ field: 'internshipId', message: 'Internship ID is required' });
  } else if (typeof body.internshipId !== 'string' || !body.internshipId.trim()) {
    errors.push({ field: 'internshipId', message: 'Internship ID cannot be empty' });
  } else if (body.internshipId.trim().length > 50) {
    errors.push({ field: 'internshipId', message: 'Internship ID must not exceed 50 characters' });
  }

  // Full Name validation
  if (body.fullName === undefined || body.fullName === null) {
    errors.push({ field: 'fullName', message: 'Full name is required' });
  } else if (typeof body.fullName !== 'string' || !body.fullName.trim()) {
    errors.push({ field: 'fullName', message: 'Full name cannot be empty' });
  } else {
    const trimmedName = body.fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      errors.push({
        field: 'fullName',
        message: 'Full name must be between 2 and 100 characters'
      });
    }
  }

  // Email validation
  if (body.email === undefined || body.email === null) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (typeof body.email !== 'string' || !body.email.trim()) {
    errors.push({ field: 'email', message: 'Email address cannot be empty' });
  } else {
    const trimmedEmail = body.email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail) || trimmedEmail.length > 255) {
      errors.push({
        field: 'email',
        message: 'A valid email address is required (e.g. user@example.com)'
      });
    }
  }

  // Portfolio URL validation (optional, but must be a safe absolute HTTP(S) URL when supplied)
  if (body.portfolioUrl !== undefined && body.portfolioUrl !== null && body.portfolioUrl !== '') {
    if (!isSafeHttpUrl(body.portfolioUrl)) {
      errors.push({
        field: 'portfolioUrl',
        message: 'Portfolio URL must be a valid absolute HTTP or HTTPS URL without embedded credentials (maximum 2048 characters)'
      });
    }
  }

  // Cover Letter validation (optional)
  if (body.coverLetter !== undefined && body.coverLetter !== null) {
    if (typeof body.coverLetter !== 'string') {
      errors.push({ field: 'coverLetter', message: 'Cover letter must be a string' });
    } else if (body.coverLetter.trim().length > 1000) {
      errors.push({
        field: 'coverLetter',
        message: 'Cover letter must not exceed 1000 characters'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateCreateApplication,
  isSafeHttpUrl
};
