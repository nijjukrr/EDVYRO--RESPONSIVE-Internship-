const VALID_MODES = new Set(['Remote', 'Hybrid', 'On-site']);
const ID_PATTERN = /^[A-Za-z0-9_-]{2,50}$/;

const ALLOWED_FIELDS = new Set([
  'id',
  'title',
  'domain',
  'mode',
  'location',
  'skills',
  'openings'
]);

/**
 * Validates pagination query parameters.
 * @param {object} query
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validatePaginationQuery(query) {
  const errors = [];

  if (query.page !== undefined) {
    const rawPage = String(query.page).trim();
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1) {
      errors.push({
        field: 'page',
        message: 'Page must be a positive integer greater than or equal to 1'
      });
    }
  }

  if (query.limit !== undefined) {
    const rawLimit = String(query.limit).trim();
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100) {
      errors.push({
        field: 'limit',
        message: 'Limit must be an integer between 1 and 100'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates request payload for creating an internship.
 * @param {object} body
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateCreateInternship(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }]
    };
  }

  // Check for unsupported fields
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({
        field: key,
        message: `Unsupported property '${key}'`
      });
    }
  }

  // ID validation
  if (body.id === undefined || body.id === null) {
    errors.push({ field: 'id', message: 'ID is required' });
  } else if (typeof body.id !== 'string' || !body.id.trim()) {
    errors.push({ field: 'id', message: 'ID cannot be empty' });
  } else if (!ID_PATTERN.test(body.id.trim())) {
    errors.push({
      field: 'id',
      message: 'ID must be 2-50 characters alphanumeric with hyphens or underscores (e.g. INT-106)'
    });
  }

  // Title validation
  if (body.title === undefined || body.title === null) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (typeof body.title !== 'string' || !body.title.trim()) {
    errors.push({ field: 'title', message: 'Title cannot be empty' });
  }

  // Domain validation
  if (body.domain === undefined || body.domain === null) {
    errors.push({ field: 'domain', message: 'Domain is required' });
  } else if (typeof body.domain !== 'string' || !body.domain.trim()) {
    errors.push({ field: 'domain', message: 'Domain cannot be empty' });
  }

  // Mode validation
  if (body.mode === undefined || body.mode === null) {
    errors.push({ field: 'mode', message: 'Mode is required' });
  } else if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode.trim())) {
    errors.push({
      field: 'mode',
      message: "Mode must be one of: 'Remote', 'Hybrid', 'On-site'"
    });
  }

  // Location validation
  if (body.location === undefined || body.location === null) {
    errors.push({ field: 'location', message: 'Location is required' });
  } else if (typeof body.location !== 'string' || !body.location.trim()) {
    errors.push({ field: 'location', message: 'Location cannot be empty' });
  }

  // Skills validation
  if (body.skills === undefined || body.skills === null) {
    errors.push({ field: 'skills', message: 'Skills is required' });
  } else if (!Array.isArray(body.skills)) {
    errors.push({ field: 'skills', message: 'Skills must be an array of non-empty strings' });
  } else if (body.skills.length === 0) {
    errors.push({ field: 'skills', message: 'Skills array must contain at least one skill' });
  } else {
    const invalidSkill = body.skills.some(
      (s) => typeof s !== 'string' || !s.trim()
    );
    if (invalidSkill) {
      errors.push({
        field: 'skills',
        message: 'Each item in skills must be a non-empty string'
      });
    }
  }

  // Openings validation
  if (body.openings === undefined || body.openings === null) {
    errors.push({ field: 'openings', message: 'Openings is required' });
  } else if (
    typeof body.openings !== 'number' ||
    !Number.isInteger(body.openings) ||
    body.openings < 0
  ) {
    errors.push({
      field: 'openings',
      message: 'Openings must be a non-negative integer'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates request payload for updating an internship.
 * @param {object} body
 * @param {string} routeId
 * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
 */
function validateUpdateInternship(body, routeId) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }]
    };
  }

  // Check for unsupported fields
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push({
        field: key,
        message: `Unsupported property '${key}'`
      });
    }
  }

  // Ensure client cannot change ID through body
  if (body.id !== undefined && body.id !== null) {
    if (typeof body.id !== 'string' || body.id.trim() !== routeId) {
      errors.push({
        field: 'id',
        message: 'Modifying internship ID is not allowed'
      });
    }
  }

  // Title validation
  if (body.title === undefined || body.title === null) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (typeof body.title !== 'string' || !body.title.trim()) {
    errors.push({ field: 'title', message: 'Title cannot be empty' });
  }

  // Domain validation
  if (body.domain === undefined || body.domain === null) {
    errors.push({ field: 'domain', message: 'Domain is required' });
  } else if (typeof body.domain !== 'string' || !body.domain.trim()) {
    errors.push({ field: 'domain', message: 'Domain cannot be empty' });
  }

  // Mode validation
  if (body.mode === undefined || body.mode === null) {
    errors.push({ field: 'mode', message: 'Mode is required' });
  } else if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode.trim())) {
    errors.push({
      field: 'mode',
      message: "Mode must be one of: 'Remote', 'Hybrid', 'On-site'"
    });
  }

  // Location validation
  if (body.location === undefined || body.location === null) {
    errors.push({ field: 'location', message: 'Location is required' });
  } else if (typeof body.location !== 'string' || !body.location.trim()) {
    errors.push({ field: 'location', message: 'Location cannot be empty' });
  }

  // Skills validation
  if (body.skills === undefined || body.skills === null) {
    errors.push({ field: 'skills', message: 'Skills is required' });
  } else if (!Array.isArray(body.skills)) {
    errors.push({ field: 'skills', message: 'Skills must be an array of non-empty strings' });
  } else if (body.skills.length === 0) {
    errors.push({ field: 'skills', message: 'Skills array must contain at least one skill' });
  } else {
    const invalidSkill = body.skills.some(
      (s) => typeof s !== 'string' || !s.trim()
    );
    if (invalidSkill) {
      errors.push({
        field: 'skills',
        message: 'Each item in skills must be a non-empty string'
      });
    }
  }

  // Openings validation
  if (body.openings === undefined || body.openings === null) {
    errors.push({ field: 'openings', message: 'Openings is required' });
  } else if (
    typeof body.openings !== 'number' ||
    !Number.isInteger(body.openings) ||
    body.openings < 0
  ) {
    errors.push({
      field: 'openings',
      message: 'Openings must be a non-negative integer'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validatePaginationQuery,
  validateCreateInternship,
  validateUpdateInternship
};
