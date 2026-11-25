import { getStipendCategory } from "./filters.js";

let activeTriggerElement = null;
let keydownHandlerRef = null;

/**
 * Computes two-letter initials from company name or domain without inventing names.
 * @param {object} internship
 * @returns {string}
 */
function getInitials(internship) {
  const source = internship.company || internship.domain || "IB";
  const words = source
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Formats openings count consistently.
 * @param {number | null} openings
 * @returns {string}
 */
function formatOpenings(openings) {
  if (typeof openings !== "number") {
    return "Not specified";
  }
  return openings === 1 ? "1 opening" : `${openings} openings`;
}

/**
 * Formats stipend for display.
 * @param {string | number | null} stipend
 * @returns {string}
 */
function formatStipend(stipend) {
  if (stipend === null || stipend === undefined || stipend === "") {
    return "Not specified";
  }
  return String(stipend);
}

/**
 * Maps work mode text to a badge modifier class.
 * @param {string} mode
 * @returns {string}
 */
function getModeBadgeClass(mode) {
  const normalized = mode.trim().toLowerCase();
  if (normalized === "remote") return "badge-mode-remote";
  if (normalized === "hybrid") return "badge-mode-hybrid";
  if (normalized === "on-site" || normalized === "onsite") return "badge-mode-onsite";
  return "badge-mode";
}

/**
 * Creates a safe SVG icon element for empty or error states.
 * @param {"search" | "alert"} kind
 * @returns {SVGSVGElement}
 */
function createStateIcon(kind) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "28");
  svg.setAttribute("height", "28");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  if (kind === "search") {
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "7");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "2");

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M16.5 16.5L21 21");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");

    svg.append(circle, path);
  } else {
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "9");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "2");

    const line = document.createElementNS(ns, "path");
    line.setAttribute("d", "M12 8v5M12 16.5h.01");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "2.2");
    line.setAttribute("stroke-linecap", "round");

    svg.append(circle, line);
  }

  return svg;
}

/**
 * Updates dynamic statistics cards and hero mini-stats from the loaded dataset.
 * @param {object[]} internships
 */
export function updateStatistics(internships) {
  const totalInternships = internships.length;
  const totalOpenings = internships.reduce(
    (sum, item) => sum + (typeof item.openings === "number" ? item.openings : 0),
    0
  );
  const uniqueDomains = new Set(internships.map((item) => item.domain)).size;
  const remoteCount = internships.filter(
    (item) => item.mode.toLowerCase() === "remote"
  ).length;
  const paidCount = internships.filter(
    (item) => getStipendCategory(item) === "paid"
  ).length;
  const unspecifiedStipendCount = internships.filter(
    (item) => getStipendCategory(item) === "unspecified"
  ).length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("hero-stat-total", totalInternships);
  setText("hero-stat-openings", totalOpenings);
  setText("hero-stat-domains", uniqueDomains);

  setText("stat-total", totalInternships);
  setText(
    "stat-openings-note",
    totalOpenings > 0
      ? `${totalOpenings} total ${totalOpenings === 1 ? "opening" : "openings"}`
      : "From verified dataset"
  );

  setText("stat-domains", uniqueDomains);
  setText("stat-domains-note", uniqueDomains === 1 ? "1 active domain" : `${uniqueDomains} career tracks`);

  setText("stat-remote", remoteCount);
  setText(
    "stat-remote-note",
    totalInternships > 0
      ? `${Math.round((remoteCount / totalInternships) * 100)}% of current listings`
      : "Work-from-anywhere roles"
  );

  if (totalInternships === 0) {
    setText("stat-paid", "0");
    setText("stat-paid-note", "No internships loaded");
  } else if (unspecifiedStipendCount === totalInternships) {
    setText("stat-paid", "N/A");
    setText("stat-paid-note", "Not provided in official dataset");
  } else {
    setText("stat-paid", paidCount);
    setText("stat-paid-note", "Based on dataset stipend info");
  }
}

/**
 * Resets dashboard statistics to unavailable placeholders after a failed load.
 */
export function resetStatistics() {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("hero-stat-total", "—");
  setText("hero-stat-openings", "—");
  setText("hero-stat-domains", "—");

  setText("stat-total", "—");
  setText("stat-openings-note", "Dataset unavailable");
  setText("stat-domains", "—");
  setText("stat-domains-note", "Dataset unavailable");
  setText("stat-remote", "—");
  setText("stat-remote-note", "Dataset unavailable");
  setText("stat-paid", "—");
  setText("stat-paid-note", "Dataset unavailable");
}

/**
 * Populates a <select> dropdown with dynamic options while preserving the default "all" option.
 * @param {HTMLSelectElement} selectEl
 * @param {string[]} options
 * @param {string} defaultLabel
 */
export function populateSelectOptions(selectEl, options, defaultLabel) {
  if (!selectEl) return;

  const previousValue = selectEl.value;
  selectEl.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = defaultLabel;
  selectEl.appendChild(defaultOption);

  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (options.includes(previousValue)) {
    selectEl.value = previousValue;
  } else {
    selectEl.value = "all";
  }
}

/**
 * Builds a single internship card DOM element safely.
 * @param {object} internship
 * @param {(internship: object, trigger: HTMLElement) => void} onViewDetails
 * @param {(internship: object, trigger: HTMLElement) => void} onApply
 * @returns {HTMLElement}
 */
export function createInternshipCard(internship, onViewDetails, onApply) {
  const card = document.createElement("article");
  card.className = "internship-card";
  card.setAttribute("aria-labelledby", `card-title-${internship.id}`);

  // Header: initials, title, company/organization status, ID badge
  const header = document.createElement("div");
  header.className = "card-header";

  const identity = document.createElement("div");
  identity.className = "card-identity";

  const initials = document.createElement("div");
  initials.className = "company-initials";
  initials.setAttribute("aria-hidden", "true");
  initials.textContent = getInitials(internship);

  const titles = document.createElement("div");
  titles.className = "card-titles";

  const titleEl = document.createElement("h3");
  titleEl.className = "card-title";
  titleEl.id = `card-title-${internship.id}`;
  titleEl.textContent = internship.title;

  const companyEl = document.createElement("p");
  companyEl.className = "card-company";
  companyEl.textContent = internship.company || "Organization not specified";

  titles.append(titleEl, companyEl);
  identity.append(initials, titles);

  const idBadge = document.createElement("span");
  idBadge.className = "badge badge-id";
  idBadge.textContent = internship.id;

  header.append(identity, idBadge);

  // Domain & Work Mode badges
  const badges = document.createElement("div");
  badges.className = "card-badges";

  const domainBadge = document.createElement("span");
  domainBadge.className = "badge badge-domain";
  domainBadge.textContent = internship.domain;

  const modeBadge = document.createElement("span");
  modeBadge.className = `badge ${getModeBadgeClass(internship.mode)}`;
  modeBadge.textContent = internship.mode;

  badges.append(domainBadge, modeBadge);

  // Metadata grid: Location, Mode, Duration, Stipend
  const metaList = document.createElement("dl");
  metaList.className = "card-meta-list";

  const metaItems = [
    { label: "Location", value: internship.location },
    { label: "Work Mode", value: internship.mode },
    { label: "Duration", value: internship.duration || "Not specified" },
    { label: "Stipend", value: formatStipend(internship.stipend) },
  ];

  metaItems.forEach(({ label, value }) => {
    const itemWrap = document.createElement("div");
    itemWrap.className = "card-meta-item";

    const dt = document.createElement("dt");
    dt.className = "card-meta-label";
    dt.textContent = label;

    const dd = document.createElement("dd");
    dd.className = "card-meta-value";
    dd.textContent = value;

    itemWrap.append(dt, dd);
    metaList.appendChild(itemWrap);
  });

  // Description
  const desc = document.createElement("p");
  desc.className = "card-description";
  desc.textContent =
    internship.description ||
    `Focuses on ${internship.domain} (${internship.mode}) in ${internship.location}. Full role description is not included in the sample dataset.`;

  // Skills
  const skillsWrap = document.createElement("div");
  skillsWrap.className = "card-skills-wrap";

  const skillsList = document.createElement("ul");
  skillsList.className = "skill-tags";
  skillsList.setAttribute("aria-label", `Required skills for ${internship.title}`);

  internship.skills.forEach((skill) => {
    const li = document.createElement("li");
    li.className = "skill-tag";
    li.textContent = skill;
    skillsList.appendChild(li);
  });

  skillsWrap.appendChild(skillsList);

  // Card footer: Openings + View Details + Apply Now buttons
  const footer = document.createElement("div");
  footer.className = "card-footer";

  const openingsEl = document.createElement("span");
  openingsEl.className = "card-openings";
  openingsEl.textContent = formatOpenings(internship.openings);

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "card-actions";

  const detailsBtn = document.createElement("button");
  detailsBtn.type = "button";
  detailsBtn.className = "btn btn-primary btn-sm btn-view-details";
  detailsBtn.textContent = "View Details";
  detailsBtn.setAttribute("aria-label", `View details for ${internship.title} (${internship.id})`);
  detailsBtn.addEventListener("click", () => onViewDetails(internship, detailsBtn));

  actionsWrap.appendChild(detailsBtn);

  if (typeof onApply === "function") {
    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.className = "btn btn-secondary btn-sm btn-apply";
    applyBtn.textContent = "Apply Now";
    applyBtn.setAttribute("aria-label", `Apply for ${internship.title} (${internship.id})`);
    applyBtn.addEventListener("click", () => onApply(internship, applyBtn));
    actionsWrap.appendChild(applyBtn);
  }

  footer.append(openingsEl, actionsWrap);

  card.append(header, badges, metaList, desc, skillsWrap, footer);
  return card;
}

/**
 * Renders the list of internship cards into the results container.
 * @param {object[]} internships
 * @param {HTMLElement} container
 * @param {(internship: object, trigger: HTMLElement) => void} onViewDetails
 * @param {(internship: object, trigger: HTMLElement) => void} [onApply]
 */
export function renderInternships(internships, container, onViewDetails, onApply) {
  if (!container) return;

  const grid = document.createElement("div");
  grid.className = "cards-grid";

  const fragment = document.createDocumentFragment();
  internships.forEach((internship) => {
    fragment.appendChild(createInternshipCard(internship, onViewDetails, onApply));
  });

  grid.appendChild(fragment);
  container.replaceChildren(grid);
}

/**
 * Updates the live results count banner and honestly labels the active data source.
 * @param {HTMLElement} countEl
 * @param {number} matchedCount
 * @param {number} totalCount
 * @param {number} matchedOpenings
 * @param {"api" | "static" | null} [sourceType]
 */
export function updateResultsCount(countEl, matchedCount, totalCount, matchedOpenings, sourceType = null) {
  if (!countEl) return;

  countEl.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = `${matchedCount} of ${totalCount}`;

  const prefix = document.createTextNode("Showing ");
  const roleLabel = matchedCount === 1 ? "internship" : "internships";
  const openingLabel = matchedOpenings === 1 ? "opening" : "openings";
  const sourceLabel =
    sourceType === "static"
      ? " • Source: Verified Static Dataset"
      : sourceType === "api"
        ? " • Source: Local Express API"
        : "";
  const suffixText = ` ${roleLabel} (${matchedOpenings} ${openingLabel})${sourceLabel}`;

  countEl.append(prefix, strong, document.createTextNode(suffixText));
}

/**
 * Displays a loading indicator while records are being fetched.
 * @param {HTMLElement} container
 */
export function showLoadingState(container) {
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = "loading-state";
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-live", "polite");

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("p");
  text.textContent = "Loading internship opportunities...";

  wrapper.append(spinner, text);
  container.replaceChildren(wrapper);
}

/**
 * Displays the Empty State when search/filter criteria match zero records or the dataset is empty.
 * @param {HTMLElement} container
 * @param {boolean} hasSearchQuery
 * @param {() => void} onClearFilters
 * @param {() => void} onResetSearch
 * @param {boolean} [hasAnyRecords]
 */
export function showEmptyState(container, hasSearchQuery, onClearFilters, onResetSearch, hasAnyRecords = true) {
  if (!container) return;

  const stateCard = document.createElement("div");
  stateCard.className = "state-card";
  stateCard.setAttribute("role", "status");
  stateCard.setAttribute("aria-live", "polite");

  const iconWrap = document.createElement("div");
  iconWrap.className = "state-icon";
  iconWrap.appendChild(createStateIcon("search"));

  const heading = document.createElement("h3");
  heading.className = "state-title";
  heading.textContent = "No internships found.";

  const message = document.createElement("p");
  message.className = "state-message";
  message.textContent = hasAnyRecords
    ? "No listings match your current search or filter combination. Try broadening your keywords or clearing active filters."
    : "No internship records are currently available from the configured data source.";

  const actions = document.createElement("div");
  actions.className = "state-actions";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn btn-primary";
  clearBtn.textContent = hasAnyRecords ? "Clear Filters" : "Refresh";
  clearBtn.addEventListener("click", onClearFilters);
  actions.appendChild(clearBtn);

  if (hasAnyRecords && hasSearchQuery) {
    const resetSearchBtn = document.createElement("button");
    resetSearchBtn.type = "button";
    resetSearchBtn.className = "btn btn-secondary";
    resetSearchBtn.textContent = "Reset Search";
    resetSearchBtn.addEventListener("click", onResetSearch);
    actions.appendChild(resetSearchBtn);
  }

  stateCard.append(iconWrap, heading, message, actions);
  container.replaceChildren(stateCard);
}

/**
 * Displays a recoverable Error State with a Retry action.
 * Prevents duplicate simultaneous retry clicks while a reload is running.
 * @param {HTMLElement} container
 * @param {string} errorMessage
 * @param {() => void} onRetry
 */
export function showErrorState(container, errorMessage, onRetry) {
  if (!container) return;

  const stateCard = document.createElement("div");
  stateCard.className = "state-card state-card-error";
  stateCard.setAttribute("role", "alert");

  const iconWrap = document.createElement("div");
  iconWrap.className = "state-icon";
  iconWrap.appendChild(createStateIcon("alert"));

  const heading = document.createElement("h3");
  heading.className = "state-title";
  heading.textContent = "Unable to load internships";

  const message = document.createElement("p");
  message.className = "state-message";
  message.textContent =
    errorMessage || "An unexpected error occurred while retrieving internship records.";

  const actions = document.createElement("div");
  actions.className = "state-actions";

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn btn-primary";
  retryBtn.textContent = "Retry";
  retryBtn.addEventListener("click", () => {
    if (retryBtn.disabled) return;
    retryBtn.disabled = true;
    retryBtn.textContent = "Retrying...";
    onRetry();
  });

  actions.appendChild(retryBtn);
  stateCard.append(iconWrap, heading, message, actions);
  container.replaceChildren(stateCard);
}

/**
 * Returns focusable elements inside a container for modal keyboard focus trapping.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return [...container.querySelectorAll(selector)].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  );
}

/**
 * Opens the accessible internship details modal and populates all sections safely.
 * @param {object} internship
 * @param {HTMLElement | null} triggerElement
 * @param {((internship: object, trigger: HTMLElement) => void) | null} [onApply]
 */
export function openInternshipDetails(internship, triggerElement = null, onApply = null) {
  const modal = document.getElementById("internship-modal");
  if (!modal) return;

  activeTriggerElement = triggerElement || document.activeElement;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("modal-id", internship.id);
  setText("modal-domain", internship.domain);

  const modalModeBadge = document.getElementById("modal-mode");
  if (modalModeBadge) {
    modalModeBadge.textContent = internship.mode;
    modalModeBadge.className = `badge ${getModeBadgeClass(internship.mode)}`;
  }

  setText("modal-title", internship.title);
  setText(
    "modal-company",
    internship.company || "Organization not specified in source dataset"
  );
  setText("modal-location", internship.location);
  setText("modal-work-mode", internship.mode);
  setText("modal-openings", formatOpenings(internship.openings));
  setText("modal-duration", internship.duration || "Not specified in dataset");
  setText("modal-stipend", formatStipend(internship.stipend));
  setText("modal-eligibility", internship.eligibility || "Not specified in dataset");

  setText(
    "modal-description",
    internship.description ||
      `This ${internship.title} listing is categorized under ${internship.domain} (${internship.mode}, ${internship.location}). A detailed narrative description is not provided in the supplied dataset.`
  );

  // Responsibilities
  const respContainer = document.getElementById("modal-responsibilities");
  if (respContainer) {
    respContainer.replaceChildren();
    if (Array.isArray(internship.responsibilities) && internship.responsibilities.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "modal-list";
      internship.responsibilities.forEach((resp) => {
        const li = document.createElement("li");
        li.textContent = resp;
        ul.appendChild(li);
      });
      respContainer.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.textContent = "Specific day-to-day responsibilities are not specified in the supplied dataset.";
      respContainer.appendChild(p);
    }
  }

  // Skills
  const skillsContainer = document.getElementById("modal-skills");
  if (skillsContainer) {
    skillsContainer.replaceChildren();
    internship.skills.forEach((skill) => {
      const li = document.createElement("li");
      li.className = "skill-tag";
      li.textContent = skill;
      skillsContainer.appendChild(li);
    });
  }

  // Application information (never fabricate fake URLs)
  const applyContainer = document.getElementById("modal-application");
  if (applyContainer) {
    applyContainer.replaceChildren();

    const infoText = document.createElement("p");
    infoText.textContent =
      internship.applicationInstructions ||
      (internship.applicationUrl
        ? "Use the verified application link below to apply for this internship."
        : "Application instructions and external application URL are unavailable in the supplied dataset.");
    applyContainer.appendChild(infoText);

    if (internship.applicationUrl) {
      const link = document.createElement("a");
      link.href = internship.applicationUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "btn btn-primary btn-sm modal-application-link";
      link.textContent = "Open Application Link";
      applyContainer.appendChild(link);
    }
  }

  // Hook up the Details modal Apply button
  const modalApplyBtn = document.getElementById("modal-apply-btn");
  if (modalApplyBtn) {
    modalApplyBtn.onclick = () => {
      closeInternshipDetails();
      if (typeof onApply === "function") {
        onApply(internship, modalApplyBtn);
      }
    };
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");

  const closeTopBtn = document.getElementById("modal-close-top");
  if (closeTopBtn) {
    closeTopBtn.focus();
  }

  if (keydownHandlerRef) {
    document.removeEventListener("keydown", keydownHandlerRef);
  }

  keydownHandlerRef = (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeInternshipDetails();
      return;
    }

    if (event.key === "Tab") {
      const focusables = getFocusableElements(modal);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener("keydown", keydownHandlerRef);
}

/**
 * Closes the internship details modal and restores focus to the element that opened it.
 */
export function closeInternshipDetails() {
  const modal = document.getElementById("internship-modal");
  if (!modal || modal.hidden) return;

  modal.hidden = true;
  document.body.classList.remove("modal-open");

  if (keydownHandlerRef) {
    document.removeEventListener("keydown", keydownHandlerRef);
    keydownHandlerRef = null;
  }

  if (activeTriggerElement && typeof activeTriggerElement.focus === "function") {
    activeTriggerElement.focus();
  }
  activeTriggerElement = null;
}
