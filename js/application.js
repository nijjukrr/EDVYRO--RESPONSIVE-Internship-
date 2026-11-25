import { getApiEndpoint } from "./config.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PORTFOLIO_URL_LENGTH = 2048;

function isSafeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_PORTFOLIO_URL_LENGTH) return false;
  if (/[\s\u0000-\u001F\u007F]/.test(value) || value.startsWith("//") || value.includes('\\')) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

let activeAppTriggerElement = null;
let appKeydownHandlerRef = null;
let currentInternship = null;
let lastOpenedInternshipId = null;
let isSubmitting = false;

/**
 * Validates application form data on the client side.
 * @param {{ internshipId: string, fullName: string, email: string, coverLetter?: string }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateApplicationClient(data) {
  const errors = {};

  if (!data.internshipId || !data.internshipId.trim()) {
    errors.internshipId = "Please select a valid internship before applying.";
  }

  const name = (data.fullName || "").trim();
  if (!name) {
    errors.fullName = "Full name is required.";
  } else if (name.length < 2) {
    errors.fullName = "Full name must be at least 2 characters long.";
  } else if (name.length > 100) {
    errors.fullName = "Full name cannot exceed 100 characters.";
  }

  const email = (data.email || "").trim();
  if (!email) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.email = "Please enter a valid email address (e.g. name@example.com).";
  }

  const portfolioUrl = (data.portfolioUrl || "").trim();
  if (portfolioUrl && !isSafeHttpUrl(portfolioUrl)) {
    errors.portfolioUrl = "Enter a valid HTTP or HTTPS portfolio URL without embedded credentials.";
  }

  const coverLetter = (data.coverLetter || "").trim();
  if (coverLetter.length > 1000) {
    errors.coverLetter = "Cover letter cannot exceed 1000 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Returns focusable elements within a container for keyboard focus trapping.
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
 * Clears inline field validation errors and alert messages.
 */
function clearValidationErrors() {
  const alertBox = document.getElementById("app-form-alert");
  const alertMsg = document.getElementById("app-form-alert-msg");
  if (alertBox) {
    alertBox.hidden = true;
  }
  if (alertMsg) {
    alertMsg.textContent = "";
  }

  const errorIds = [
    "app-error-full-name",
    "app-error-email",
    "app-error-portfolio-url",
    "app-error-cover-letter"
  ];
  errorIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  const inputIds = [
    "app-input-full-name",
    "app-input-email",
    "app-input-portfolio-url",
    "app-input-cover-letter"
  ];
  inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("is-invalid");
      el.removeAttribute("aria-invalid");
    }
  });
}

/**
 * Renders inline field validation errors and focuses the first invalid field.
 * @param {Record<string, string>} errors
 */
function displayValidationErrors(errors) {
  clearValidationErrors();

  const fieldMap = {
    fullName: { input: "app-input-full-name", msg: "app-error-full-name" },
    email: { input: "app-input-email", msg: "app-error-email" },
    portfolioUrl: { input: "app-input-portfolio-url", msg: "app-error-portfolio-url" },
    coverLetter: { input: "app-input-cover-letter", msg: "app-error-cover-letter" }
  };

  let firstInvalid = null;

  for (const [field, message] of Object.entries(errors)) {
    const mapping = fieldMap[field];
    if (mapping) {
      const inputEl = document.getElementById(mapping.input);
      const msgEl = document.getElementById(mapping.msg);
      if (inputEl) {
        inputEl.classList.add("is-invalid");
        inputEl.setAttribute("aria-invalid", "true");
        if (!firstInvalid) firstInvalid = inputEl;
      }
      if (msgEl) {
        msgEl.textContent = message;
      }
    } else {
      showFormAlert(message);
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
  }
}

/**
 * Shows an alert message at the top of the form modal.
 * @param {string} message
 */
function showFormAlert(message) {
  const alertBox = document.getElementById("app-form-alert");
  const alertMsg = document.getElementById("app-form-alert-msg");
  if (alertBox && alertMsg) {
    alertMsg.textContent = message;
    alertBox.hidden = false;
  }
}

/**
 * Opens the application modal for a given internship.
 * @param {object} internship
 * @param {HTMLElement|null} triggerElement
 */
export function openApplicationModal(internship, triggerElement = null) {
  const modal = document.getElementById("application-modal");
  if (!modal) return;

  currentInternship = internship;
  activeAppTriggerElement = triggerElement || document.activeElement;

  // Reset view states
  const form = document.getElementById("application-form");
  const successState = document.getElementById("app-success-state");
  if (form) {
    form.hidden = false;
    if (lastOpenedInternshipId && lastOpenedInternshipId !== internship.id) {
      form.reset();
    }
  }
  lastOpenedInternshipId = internship.id;
  if (successState) successState.hidden = true;
  clearValidationErrors();

  // Populate metadata badges and inputs
  const idEl = document.getElementById("app-modal-id");
  const domainEl = document.getElementById("app-modal-domain");
  const modeEl = document.getElementById("app-modal-mode");
  const titleEl = document.getElementById("app-modal-title");
  const companyEl = document.getElementById("app-modal-company");
  const inputId = document.getElementById("app-input-internship-id");

  if (idEl) idEl.textContent = internship.id;
  if (domainEl) domainEl.textContent = internship.domain;
  if (modeEl) modeEl.textContent = internship.mode;
  if (titleEl) titleEl.textContent = `Apply for ${internship.title}`;
  if (companyEl) companyEl.textContent = internship.company || "EdVyro Verified Internship";
  if (inputId) inputId.value = internship.id;

  // Reset character counter
  const charCounter = document.getElementById("app-char-counter");
  const coverLetterInput = document.getElementById("app-input-cover-letter");
  if (charCounter && coverLetterInput) {
    charCounter.textContent = `${coverLetterInput.value.length} / 1000`;
  }

  // Open modal
  modal.hidden = false;
  document.body.classList.add("modal-open");

  const nameInput = document.getElementById("app-input-full-name");
  if (nameInput) {
    nameInput.focus();
  }

  // Keyboard navigation & focus trapping
  if (appKeydownHandlerRef) {
    document.removeEventListener("keydown", appKeydownHandlerRef);
  }

  appKeydownHandlerRef = (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeApplicationModal();
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

  document.addEventListener("keydown", appKeydownHandlerRef);
}

/**
 * Closes the application modal and restores focus to the trigger element.
 */
export function closeApplicationModal() {
  const modal = document.getElementById("application-modal");
  if (!modal || modal.hidden) return;

  modal.hidden = true;
  document.body.classList.remove("modal-open");

  if (appKeydownHandlerRef) {
    document.removeEventListener("keydown", appKeydownHandlerRef);
    appKeydownHandlerRef = null;
  }

  if (activeAppTriggerElement && typeof activeAppTriggerElement.focus === "function") {
    activeAppTriggerElement.focus();
  }
  activeAppTriggerElement = null;
  currentInternship = null;
}

/**
 * Handles application form submission.
 * @param {Event} event
 */
async function handleApplicationSubmit(event) {
  event.preventDefault();

  if (isSubmitting) return;

  const form = document.getElementById("application-form");
  if (!form) return;

  const submitBtn = document.getElementById("app-submit-btn");
  const btnSpinner = document.getElementById("app-btn-spinner");
  const btnText = document.getElementById("app-btn-text");

  clearValidationErrors();

  const rawInternshipId = document.getElementById("app-input-internship-id")?.value || "";
  const rawFullName = document.getElementById("app-input-full-name")?.value || "";
  const rawEmail = document.getElementById("app-input-email")?.value || "";
  const rawPortfolioUrl = document.getElementById("app-input-portfolio-url")?.value || "";
  const rawCoverLetter = document.getElementById("app-input-cover-letter")?.value || "";

  const formData = {
    internshipId: rawInternshipId,
    fullName: rawFullName,
    email: rawEmail,
    portfolioUrl: rawPortfolioUrl,
    coverLetter: rawCoverLetter
  };

  // 1. Client-side validation
  const validation = validateApplicationClient(formData);
  if (!validation.isValid) {
    displayValidationErrors(validation.errors);
    return;
  }

  // 2. Check environment API availability before making network call
  const endpoint = getApiEndpoint("/applications");
  if (!endpoint) {
    showFormAlert(
      "Backend API URL is not configured for this environment yet. Set <meta name=\"internboard-api-url\"> or window.__API_BASE_URL__ to your deployed Render API URL (including /api), or run the backend locally (http://localhost:5000) to submit applications."
    );
    return;
  }

  // 3. Set submitting state (prevent duplicate clicks)
  isSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;
  if (btnSpinner) btnSpinner.hidden = false;
  if (btnText) btnText.textContent = "Submitting...";

  const requestBody = {
    internshipId: rawInternshipId.trim(),
    fullName: rawFullName.trim(),
    email: rawEmail.trim(),
    portfolioUrl: rawPortfolioUrl.trim(),
    coverLetter: rawCoverLetter.trim()
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (
      response.status === 201 &&
      payload &&
      payload.status === "success" &&
      payload.data &&
      typeof payload.data.id === "string" &&
      payload.data.id.trim().length > 0
    ) {
      // 4. Verified success state driven strictly by real backend response
      form.hidden = true;
      const successState = document.getElementById("app-success-state");
      const receiptId = document.getElementById("app-receipt-id");
      const receiptPos = document.getElementById("app-receipt-position");

      if (receiptId) receiptId.textContent = payload.data.id;
      if (receiptPos && currentInternship) {
        receiptPos.textContent = `${currentInternship.title} (${currentInternship.id})`;
      }

      if (successState) successState.hidden = false;
      const doneBtn = document.getElementById("app-success-done-btn");
      if (doneBtn) doneBtn.focus();

      // Reset form fields after confirmed submission
      form.reset();
      const counter = document.getElementById("app-char-counter");
      if (counter) counter.textContent = "0 / 1000";
      return;
    }

    if (response.status === 201) {
      showFormAlert("Unexpected server response format: missing confirmation ID. Please verify submission status.");
      return;
    }

    // 5. Handle Server Validation / Conflict / Rate Limit (400, 404, 409, 429, 500)
    if (payload && payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
      const serverErrors = {};
      payload.errors.forEach((err) => {
        if (err.field) serverErrors[err.field] = err.message;
      });
      displayValidationErrors(serverErrors);
      showFormAlert(payload.message || "Please correct the highlighted errors.");
    } else if (response.status === 409) {
      showFormAlert(
        payload?.message || "An application with this email already exists for this internship."
      );
      const emailInput = document.getElementById("app-input-email");
      if (emailInput) {
        emailInput.classList.add("is-invalid");
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
      }
    } else if (response.status === 429) {
      showFormAlert(
        payload?.message || "Too many application submissions from this IP. Please wait a few minutes before trying again."
      );
    } else {
      showFormAlert(
        payload?.message || `Server returned error (${response.status} ${response.statusText || "Error"}). Please check your input and try again.`
      );
    }
  } catch (networkError) {
    console.error("[InternBoard] Application submission network failure:", networkError);
    showFormAlert(
      "Unable to reach the backend API server right now. If this is hosted on Render Free Tier, the service may be waking up—please wait a few seconds and try submitting again."
    );
  } finally {
    // 6. Restore submit button (retaining entered data for retry)
    isSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
    if (btnSpinner) btnSpinner.hidden = true;
    if (btnText) btnText.textContent = "Submit Application";
  }
}

/**
 * Initializes listeners for the application modal and form.
 */
export function initApplicationModule() {
  const form = document.getElementById("application-form");
  if (form) {
    form.addEventListener("submit", handleApplicationSubmit);
  }

  const closeTop = document.getElementById("app-modal-close-top");
  if (closeTop) {
    closeTop.addEventListener("click", closeApplicationModal);
  }

  const cancelBtn = document.getElementById("app-modal-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeApplicationModal);
  }

  const doneBtn = document.getElementById("app-success-done-btn");
  if (doneBtn) {
    doneBtn.addEventListener("click", closeApplicationModal);
  }

  const backdrop = document.querySelector("[data-app-modal-close]");
  if (backdrop) {
    backdrop.addEventListener("click", closeApplicationModal);
  }

  // Cover letter live character counter
  const coverLetter = document.getElementById("app-input-cover-letter");
  const counter = document.getElementById("app-char-counter");
  if (coverLetter && counter) {
    coverLetter.addEventListener("input", () => {
      counter.textContent = `${coverLetter.value.length} / 1000`;
    });
  }
}
