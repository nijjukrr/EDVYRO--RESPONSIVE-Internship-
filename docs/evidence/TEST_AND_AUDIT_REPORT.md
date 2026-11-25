# InternBoard — Test, Accessibility, Responsive & Performance Audit Report

## 1. Automated Test Results

### Backend Suite (`cd backend; npm test`)
- **Runner**: Node.js built-in test runner (`node --test tests/**/*.test.js`) with isolated temporary SQLite databases and parameterized PostgreSQL integration emulator
- **Result**: **53 / 53 Passed (0 Failed, 0 Skipped)** across 16 suites
  - `backend/tests/internships.test.js`: 27 passed (Health 200 & 503 DB failure, Root index, 404 handler, Read, Pagination & validation, Create, Update, Delete, Persistence)
  - `backend/tests/applications.test.js`: 21 passed (Valid `201`, Optional cover letter, Unsafe/safe `portfolioUrl`, Duplicate & case-insensitive `409`, Cross-role `201`, Missing `internshipId` `400`, Unknown role `404`, Missing name `400`, Invalid email `400`, Oversized cover letter `400`, Unsupported props `400`, Helmet headers, CORS allowlist, SQLi immunity, Public PII leak check, Rate limit `429` + headers, Unthrottled `GET /api/internships`, Logger PII redaction, Persistence)
  - `backend/tests/postgres.test.js`: 5 passed (Strict production `DATABASE_URL` guard, SSL pool config, Idempotent PG seed & CRUD with JSONB/FK constraints, PG SQLSTATE `23505`/`23503`/`22P02` error mapping, Legacy read-only SQLite migration compatibility)

### Frontend Unit & Environment Suite (`node --test tests/frontend.test.mjs`)
- **Runner**: Node.js built-in test runner (`node --test tests/frontend.test.mjs`)
- **Result**: **18 / 18 Passed (0 Failed, 0 Skipped)** across 7 suites
  - GitHub Pages host detection & `null` API base URL without override
  - Repository-relative static JSON resolution under `/` (with/without trailing slash)
  - Localhost API routing (`http://localhost:5000/api` / `/api`) and `window.__API_BASE_URL__` override
  - Preservation of all 5 official records (`INT-101`–`INT-105`, 9 openings, 4 domains, 3 Remote)
  - Valid empty `[]` dataset handling, malformed payload rejection, unsafe URL (`javascript:`) rejection
  - Single-page root `index.html` integrity & Purple/Indigo + White CSS verification (no cinematic video landing page, no monochrome overrides, no Watermelon theme toggle)
  - Search, filters, sorting, client-side application validation, and unsafe portfolio URL rejection

---

## 2. Browser End-to-End, Responsive, Accessibility & Performance Evidence

Executed via headless Google Chrome (Chrome DevTools Protocol) against local full-stack Express + SQLite + root `index.html`:

- **Single-Page Purple & White Portal (`/index.html`)**:
  - Title: `InternBoard — Responsive Internship Board`.
  - Background: `#F8FAFC` (`rgb(248, 250, 252)`), card surface `#FFFFFF`, primary CTA button background: `#4F46E5` (`rgb(79, 70, 229)`) with `#FFFFFF` text.
  - Zero cinematic video background and zero Watermelon toggle button.
  - Cards rendered: `5` (`INT-101`–`INT-105`), Stats: `5` internships, `9` openings, `4` domains, `3` remote, `N/A` paid (`Not provided in official dataset`), FAQ items: `4`.
  - Details Modal & Application Modal: keyboard navigation (`Escape` closes & restores focus to trigger button), initial modal alerts/spinner/receipt evaluate to `display: none`, valid submit stores record & renders real `APP-...` receipt.
- **Responsive Overflow Check (0 Horizontal Overflow Across All 8 Widths)**:
  - Tested `360px`, `375px`, `390px`, `430px`, `768px`, `1024px`, `1280px`, `1440px`: `scrollWidth <= innerWidth` passed at every width.
- **Accessibility Checks Performed**:
  - Single `<h1>` (`h1Count: 1`).
  - Zero unlabeled form inputs (`unlabeled: []` across search, filters, hidden ID, fullName, email, portfolio URL, coverLetter).
  - Visible `:focus-visible` outlines, `Escape` closes modals and mobile menus with focus restoration, `role="dialog"` + `aria-modal="true"`, `role="alert"` + `aria-live="polite"`.
  - Contrast: `#0F172A` primary text and `#475569` secondary text on `#FFFFFF` / `#F8FAFC`, plus `#FFFFFF` on `#4F46E5` primary CTA buttons meet WCAG AA contrast thresholds. *(Manual screen-reader voiceover walk-through recommended as final human review; automated checks do not represent formal WCAG certification.)*
- **Measured Browser Performance (Local Full-Stack Chrome Navigation Timing & Paint API)**:
  - **Local Full-Stack Portal (`/index.html`)**: `FCP`: **188 ms**, `DOMContentLoaded`: **157 ms**, `loadEventEnd`: **161 ms**.
  - **Console Errors**: **0** | **Uncaught Page Errors**: **0** | **Failed Requests**: **0**
  - **Tooling Limitation**: Neither `lighthouse` CLI nor `axe-core` CLI is installed in this environment, so numerical 0–100 Lighthouse category scores and `axe-core` JSON exports are not generated or fabricated; real Chrome PerformanceObserver/Paint API checks and Chrome DOM accessibility checks were executed instead.

---

## 3. Sample `GET /api/health` Response

```json
{
  "status": "success",
  "data": {
    "service": "InternBoard API",
    "api": "running",
    "database": "connected"
  }
}
```

## 4. Captured Visual Evidence (`docs/evidence/`)

- `portal-desktop-1440.png` — Purple/Indigo & White InternBoard portal at `1440x900`
- `portal-mobile-360.png` — Mobile responsive stats & cards at `360x800`
- `portal-application-modal.png` — Clean Purple/Indigo application modal (`INT-101`)
- `portal-application-receipt.png` — Confirmed submission receipt with server-generated `APP-...` ID (synthetic test data)
