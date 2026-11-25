/**
 * Validation utilities for InternBoard dataset records.
 * Preserves supplied values and handles omitted fields without fabricating data.
 */

const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Safely normalizes an optional string value.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates that a URL string uses http: or https: to prevent unsafe links.
 * @param {unknown} value
 * @returns {string | null}
 */
function sanitizeHttpUrl(value) {
  const raw = normalizeOptionalString(value);
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes optional responsibilities as an array of non-empty strings.
 * @param {unknown} value
 * @returns {string[] | null}
 */
function normalizeResponsibilities(value) {
  if (Array.isArray(value)) {
    const items = value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : null;
  }

  const text = normalizeOptionalString(value);
  return text ? [text] : null;
}

/**
 * Normalizes optional stipend values without inventing amounts.
 * @param {unknown} value
 * @returns {string | number | null}
 */
function normalizeStipend(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return normalizeOptionalString(value);
}

/**
 * Validates and normalizes a single internship record.
 * @param {unknown} record
 * @param {number} index
 * @returns {{ valid: boolean, internship?: object, reason?: string }}
 */
export function validateInternship(record, index = 0) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { valid: false, reason: `Record at index ${index} is not an object.` };
  }

  const id = normalizeOptionalString(record.id);
  const title = normalizeOptionalString(record.title);
  const domain = normalizeOptionalString(record.domain);
  const mode = normalizeOptionalString(record.mode ?? record.workMode);
  const location = normalizeOptionalString(record.location);

  if (!id || !title || !domain || !mode || !location) {
    return {
      valid: false,
      reason: `Record at index ${index} is missing one or more required fields (id, title, domain, mode, location).`,
    };
  }

  if (!Array.isArray(record.skills)) {
    return {
      valid: false,
      reason: `Record "${id}" has an invalid "skills" field (expected an array).`,
    };
  }

  const skills = record.skills
    .filter((skill) => typeof skill === "string")
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (skills.length === 0) {
    return {
      valid: false,
      reason: `Record "${id}" does not contain any valid skill strings.`,
    };
  }

  const openings =
    typeof record.openings === "number" &&
    Number.isInteger(record.openings) &&
    record.openings >= 0
      ? record.openings
      : null;

  const internship = {
    id,
    title,
    domain,
    mode,
    location,
    skills,
    openings,
    company: normalizeOptionalString(record.company),
    description: normalizeOptionalString(record.description),
    responsibilities: normalizeResponsibilities(record.responsibilities),
    duration: normalizeOptionalString(record.duration),
    stipend: normalizeStipend(record.stipend),
    eligibility: normalizeOptionalString(record.eligibility),
    applicationInstructions: normalizeOptionalString(
      record.applicationInstructions ?? record.applicationInfo
    ),
    applicationUrl: sanitizeHttpUrl(record.applicationUrl),
  };

  return { valid: true, internship };
}

/**
 * Validates the entire dataset payload returned from JSON.
 * Supports `{ internships: [...] }` as well as top-level arrays.
 * @param {unknown} payload
 * @returns {{ internships: object[], warnings: string[] }}
 */
export function validateDataset(payload) {
  const rawList = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.internships)
      ? payload.internships
      : payload && typeof payload === "object" && Array.isArray(payload.data)
        ? payload.data
        : null;

  if (!rawList) {
    throw new Error('Dataset format is invalid: expected an object with an "internships" array.');
  }

  const internships = [];
  const warnings = [];
  const seenIds = new Set();

  rawList.forEach((rawRecord, index) => {
    const result = validateInternship(rawRecord, index);
    if (!result.valid) {
      warnings.push(result.reason);
      return;
    }

    if (seenIds.has(result.internship.id)) {
      warnings.push(`Duplicate internship ID "${result.internship.id}" skipped at index ${index}.`);
      return;
    }

    seenIds.add(result.internship.id);
    internships.push(result.internship);
  });

  if (internships.length === 0) {
    throw new Error("No valid internship records were found in the dataset.");
  }

  return { internships, warnings };
}
