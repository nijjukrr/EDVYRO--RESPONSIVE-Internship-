/**
 * Search, filtering, and sorting utilities for InternBoard.
 */

/**
 * Classifies an internship's stipend status from the dataset record.
 * @param {object} internship
 * @returns {"paid" | "unpaid" | "unspecified"}
 */
export function getStipendCategory(internship) {
  const { stipend } = internship;

  if (stipend === null || stipend === undefined || stipend === "") {
    return "unspecified";
  }

  if (typeof stipend === "number") {
    return stipend > 0 ? "paid" : "unpaid";
  }

  const normalized = String(stipend).trim().toLowerCase();
  if (!normalized || normalized === "not specified" || normalized === "n/a") {
    return "unspecified";
  }
  if (normalized === "unpaid" || normalized === "0" || normalized === "none") {
    return "unpaid";
  }
  return "paid";
}

/**
 * Searches internships across title, company, description, domain, skills, location, and ID.
 * Case-insensitive and trims unnecessary whitespace.
 * @param {object[]} internships
 * @param {string} rawQuery
 * @returns {object[]}
 */
export function searchInternships(internships, rawQuery) {
  const query = typeof rawQuery === "string" ? rawQuery.trim().toLowerCase() : "";
  if (!query) {
    return internships;
  }

  return internships.filter((item) => {
    const searchableFields = [
      item.id,
      item.title,
      item.company,
      item.description,
      item.domain,
      item.location,
      item.mode,
      ...(Array.isArray(item.skills) ? item.skills : []),
    ];

    return searchableFields.some(
      (field) => typeof field === "string" && field.toLowerCase().includes(query)
    );
  });
}

/**
 * Filters internships by domain.
 * @param {object[]} internships
 * @param {string} domain
 * @returns {object[]}
 */
export function filterByDomain(internships, domain) {
  if (!domain || domain === "all") {
    return internships;
  }

  const target = domain.trim().toLowerCase();
  return internships.filter((item) => item.domain.toLowerCase() === target);
}

/**
 * Filters internships by work mode (Remote, Hybrid, On-site).
 * @param {object[]} internships
 * @param {string} mode
 * @returns {object[]}
 */
export function filterByWorkMode(internships, mode) {
  if (!mode || mode === "all") {
    return internships;
  }

  const target = mode.trim().toLowerCase();
  return internships.filter((item) => item.mode.toLowerCase() === target);
}

/**
 * Filters internships by stipend category.
 * @param {object[]} internships
 * @param {string} stipendFilter
 * @returns {object[]}
 */
export function filterByStipend(internships, stipendFilter) {
  if (!stipendFilter || stipendFilter === "all") {
    return internships;
  }

  return internships.filter((item) => getStipendCategory(item) === stipendFilter);
}

/**
 * Returns a new sorted array of internships without mutating the input array.
 * @param {object[]} internships
 * @param {string} sortBy
 * @returns {object[]}
 */
export function sortInternships(internships, sortBy) {
  const copy = [...internships];

  switch (sortBy) {
    case "title-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc":
      return copy.sort((a, b) => b.title.localeCompare(a.title));
    case "openings-desc":
      return copy.sort((a, b) => (b.openings ?? -1) - (a.openings ?? -1));
    case "openings-asc":
      return copy.sort((a, b) => (a.openings ?? Number.MAX_SAFE_INTEGER) - (b.openings ?? Number.MAX_SAFE_INTEGER));
    case "domain-asc":
      return copy.sort(
        (a, b) => a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title)
      );
    case "default":
    default:
      return copy;
  }
}

/**
 * Applies search, domain, work mode, stipend, and sort criteria together.
 * @param {object[]} internships
 * @param {{ query: string, domain: string, mode: string, stipend: string, sortBy: string }} state
 * @returns {object[]}
 */
export function applyAllFilters(internships, state) {
  const searched = searchInternships(internships, state.query);
  const byDomain = filterByDomain(searched, state.domain);
  const byMode = filterByWorkMode(byDomain, state.mode);
  const byStipend = filterByStipend(byMode, state.stipend);
  return sortInternships(byStipend, state.sortBy);
}

/**
 * Extracts unique, alphabetically sorted domains from the dataset.
 * @param {object[]} internships
 * @returns {string[]}
 */
export function getUniqueDomains(internships) {
  return [...new Set(internships.map((item) => item.domain))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Extracts unique work modes from the dataset in a consistent preferred order.
 * @param {object[]} internships
 * @returns {string[]}
 */
export function getUniqueWorkModes(internships) {
  const preferredOrder = ["Remote", "Hybrid", "On-site"];
  const unique = [...new Set(internships.map((item) => item.mode))];

  return unique.sort((a, b) => {
    const idxA = preferredOrder.findIndex((m) => m.toLowerCase() === a.toLowerCase());
    const idxB = preferredOrder.findIndex((m) => m.toLowerCase() === b.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}
