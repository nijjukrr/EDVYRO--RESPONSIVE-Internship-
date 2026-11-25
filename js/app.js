import { loadInternships } from "./data.js";
import { initApplicationModule, openApplicationModal } from "./application.js";
import {
  applyAllFilters,
  getUniqueDomains,
  getUniqueWorkModes,
} from "./filters.js";
import {
  closeInternshipDetails,
  openInternshipDetails,
  populateSelectOptions,
  renderInternships,
  resetStatistics,
  showEmptyState,
  showErrorState,
  showLoadingState,
  updateResultsCount,
  updateStatistics,
} from "./ui.js";

const INITIAL_FILTER_STATE = {
  query: "",
  domain: "all",
  mode: "all",
  stipend: "all",
  sortBy: "default",
};

const appState = {
  allInternships: [],
  filters: { ...INITIAL_FILTER_STATE },
  isLoaded: false,
  isLoading: false,
  sourceType: null,
};

/**
 * Collects references to interactive DOM elements.
 * @returns {object}
 */
function getDomElements() {
  return {
    navToggle: document.getElementById("nav-toggle"),
    navMenu: document.getElementById("primary-nav-menu"),
    heroSearchForm: document.getElementById("hero-search-form"),
    heroSearchInput: document.getElementById("hero-search-input"),
    searchInput: document.getElementById("search-input"),
    domainFilter: document.getElementById("domain-filter"),
    modeFilter: document.getElementById("mode-filter"),
    stipendFilter: document.getElementById("stipend-filter"),
    sortSelect: document.getElementById("sort-select"),
    clearFiltersBtn: document.getElementById("clear-filters-btn"),
    resultsCount: document.getElementById("results-count"),
    resultsContainer: document.getElementById("internship-results"),
    modal: document.getElementById("internship-modal"),
    modalCloseTop: document.getElementById("modal-close-top"),
    modalCloseBottom: document.getElementById("modal-close-bottom"),
    footerYear: document.getElementById("footer-year"),
  };
}

/**
 * Applies active filters/sorting and updates the internship grid and results count.
 */
function updateListingView(dom) {
  if (!appState.isLoaded) return;

  const filtered = applyAllFilters(appState.allInternships, appState.filters);
  const matchedOpenings = filtered.reduce(
    (sum, item) => sum + (typeof item.openings === "number" ? item.openings : 0),
    0
  );

  updateResultsCount(
    dom.resultsCount,
    filtered.length,
    appState.allInternships.length,
    matchedOpenings,
    appState.sourceType
  );

  if (filtered.length === 0) {
    const hasSearchQuery = appState.filters.query.trim().length > 0;
    const hasAnyRecords = appState.allInternships.length > 0;
    showEmptyState(
      dom.resultsContainer,
      hasSearchQuery,
      hasAnyRecords ? () => clearFilters(dom) : () => initializeDataset(dom),
      () => resetSearchOnly(dom),
      hasAnyRecords
    );
    return;
  }

  renderInternships(
    filtered,
    dom.resultsContainer,
    (internship, triggerEl) => {
      openInternshipDetails(internship, triggerEl, (item, btn) => {
        openApplicationModal(item, btn);
      });
    },
    (internship, triggerEl) => {
      openApplicationModal(internship, triggerEl);
    }
  );
}

/**
 * Resets only the search query while preserving dropdown filters.
 */
function resetSearchOnly(dom) {
  appState.filters.query = "";
  if (dom.searchInput) dom.searchInput.value = "";
  if (dom.heroSearchInput) dom.heroSearchInput.value = "";
  updateListingView(dom);
  if (dom.searchInput) dom.searchInput.focus();
}

/**
 * Resets all search, filter, and sort controls to their defaults.
 */
export function clearFilters(dom = getDomElements()) {
  appState.filters = { ...INITIAL_FILTER_STATE };

  if (dom.searchInput) dom.searchInput.value = "";
  if (dom.heroSearchInput) dom.heroSearchInput.value = "";
  if (dom.domainFilter) dom.domainFilter.value = "all";
  if (dom.modeFilter) dom.modeFilter.value = "all";
  if (dom.stipendFilter) dom.stipendFilter.value = "all";
  if (dom.sortSelect) dom.sortSelect.value = "default";

  updateListingView(dom);
}

/**
 * Fetches dataset records and renders initial statistics, filter options, and listings.
 * Guards against simultaneous overlapping requests and clears stale data on failure.
 */
async function initializeDataset(dom, dataUrl = null) {
  if (appState.isLoading) {
    return;
  }

  appState.isLoading = true;
  appState.isLoaded = false;
  appState.allInternships = [];
  appState.sourceType = null;

  showLoadingState(dom.resultsContainer);
  if (dom.resultsCount) {
    dom.resultsCount.textContent = "Loading internships...";
  }

  try {
    const { internships, sourceType } = await loadInternships(dataUrl);
    appState.allInternships = internships;
    appState.sourceType = sourceType;
    appState.isLoaded = true;

    updateStatistics(internships);
    populateSelectOptions(
      dom.domainFilter,
      getUniqueDomains(internships),
      "All Domains"
    );
    populateSelectOptions(
      dom.modeFilter,
      getUniqueWorkModes(internships),
      "All Modes"
    );

    updateListingView(dom);
  } catch (error) {
    console.error("[InternBoard] Failed to initialize internship listings:", error);
    appState.allInternships = [];
    appState.isLoaded = false;
    appState.sourceType = null;
    resetStatistics();

    if (dom.resultsCount) {
      dom.resultsCount.textContent = "Unable to load internship records.";
    }
    showErrorState(dom.resultsContainer, error.message, () => {
      initializeDataset(dom, dataUrl);
    });
  } finally {
    appState.isLoading = false;
  }
}

/**
 * Sets up accessible mobile hamburger menu interactions.
 */
function setupNavigation(dom) {
  const { navToggle, navMenu } = dom;
  if (!navToggle || !navMenu) return;

  const setMenuOpen = (isOpen) => {
    navMenu.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  };

  navToggle.addEventListener("click", () => {
    const currentlyOpen = navToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!currentlyOpen);
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (navMenu.classList.contains("is-open")) {
        setMenuOpen(false);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navMenu.classList.contains("is-open")) {
      setMenuOpen(false);
      navToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (
      navMenu.classList.contains("is-open") &&
      !navMenu.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && navMenu.classList.contains("is-open")) {
      setMenuOpen(false);
    }
  });
}

/**
 * Connects search, filter, sort, and modal event listeners.
 */
function setupEventListeners(dom) {
  if (dom.heroSearchForm && dom.heroSearchInput) {
    dom.heroSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = dom.heroSearchInput.value;
      appState.filters.query = value;
      if (dom.searchInput) {
        dom.searchInput.value = value;
      }
      updateListingView(dom);

      const listingsSection = document.getElementById("internships");
      if (listingsSection) {
        listingsSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", (event) => {
      const value = event.target.value;
      appState.filters.query = value;
      if (dom.heroSearchInput && dom.heroSearchInput.value !== value) {
        dom.heroSearchInput.value = value;
      }
      updateListingView(dom);
    });
  }

  if (dom.domainFilter) {
    dom.domainFilter.addEventListener("change", (event) => {
      appState.filters.domain = event.target.value;
      updateListingView(dom);
    });
  }

  if (dom.modeFilter) {
    dom.modeFilter.addEventListener("change", (event) => {
      appState.filters.mode = event.target.value;
      updateListingView(dom);
    });
  }

  if (dom.stipendFilter) {
    dom.stipendFilter.addEventListener("change", (event) => {
      appState.filters.stipend = event.target.value;
      updateListingView(dom);
    });
  }

  if (dom.sortSelect) {
    dom.sortSelect.addEventListener("change", (event) => {
      appState.filters.sortBy = event.target.value;
      updateListingView(dom);
    });
  }

  if (dom.clearFiltersBtn) {
    dom.clearFiltersBtn.addEventListener("click", () => {
      clearFilters(dom);
    });
  }

  if (dom.modalCloseTop) {
    dom.modalCloseTop.addEventListener("click", closeInternshipDetails);
  }

  if (dom.modalCloseBottom) {
    dom.modalCloseBottom.addEventListener("click", closeInternshipDetails);
  }

  if (dom.modal) {
    dom.modal.querySelectorAll("[data-modal-close]").forEach((el) => {
      el.addEventListener("click", closeInternshipDetails);
    });
  }
}

/**
 * Initializes the Watermelon (Green & Black) theme toggle inside the portal.
 */
function setupThemeToggle() {
  const toggleBtn = document.getElementById("theme-toggle");
  const toggleLabel = document.getElementById("theme-toggle-label");
  if (!toggleBtn) return;

  const applyTheme = (theme) => {
    const isWatermelon = theme === "watermelon";
    if (isWatermelon) {
      document.documentElement.setAttribute("data-theme", "watermelon");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    toggleBtn.setAttribute("aria-pressed", String(isWatermelon));
    toggleBtn.setAttribute(
      "aria-label",
      isWatermelon ? "Switch to Classic Light mode" : "Switch to Watermelon Green and Black mode"
    );
    if (toggleLabel) {
      toggleLabel.textContent = isWatermelon ? "Light Mode" : "Watermelon Mode";
    }
  };

  let savedTheme = "light";
  try {
    if (localStorage.getItem("INTERNBOARD_THEME") === "watermelon") {
      savedTheme = "watermelon";
    }
  } catch {
    // Ignore storage restriction
  }
  applyTheme(savedTheme);

  toggleBtn.addEventListener("click", () => {
    const currentlyWatermelon = document.documentElement.getAttribute("data-theme") === "watermelon";
    const nextTheme = currentlyWatermelon ? "light" : "watermelon";
    applyTheme(nextTheme);
    try {
      localStorage.setItem("INTERNBOARD_THEME", nextTheme);
    } catch {
      // Ignore storage restriction
    }
  });
}

/**
 * Bootstraps InternBoard when the DOM is ready.
 */
function init() {
  const dom = getDomElements();

  if (dom.footerYear) {
    dom.footerYear.textContent = String(new Date().getFullYear());
  }

  setupThemeToggle();
  setupNavigation(dom);
  setupEventListeners(dom);
  initApplicationModule();
  initializeDataset(dom);
}

document.addEventListener("DOMContentLoaded", init);
