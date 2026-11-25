# InternBoard — Test, Accessibility, Responsive & Performance Audit Report

## 1. Automated Test Results

### Backend Suite (`cd backend; npm test`)
- **Runner**: Node.js built-in test runner (`node --test tests/**/*.test.js`) with isolated temporary SQLite databases
- **Result**: **46 / 46 Passed (0 Failed, 0 Skipped)** across 11 suites (`~672ms`)
  - `backend/tests/internships.test.js`: 27 passed (Health 200 & 503 DB failure, Root index, 404 handler, Read, Pagination & validation, Create, Update, Delete, Persistence)
  - `backend/tests/applications.test.js`: 19 passed (Valid `201`, Optional cover letter, Duplicate & case-insensitive `409`, Cross-role `201`, Missing `internshipId` `400`, Unknown role `404`, Missing name `400`, Invalid email `400`, Oversized cover letter `400`, Unsupported props `400`, Helmet headers, CORS allowlist, SQLi immunity, Public PII leak check, Rate limit `429` + headers, Unthrottled `GET /api/internships`, Logger PII redaction, Persistence)

### Frontend Unit & Environment Suite (`node --test tests/frontend.test.mjs`)
- **Runner**: Node.js built-in test runner (`node --test tests/frontend.test.mjs`)
- **Result**: **16 / 16 Passed (0 Failed, 0 Skipped)** across 7 suites (`~219ms`)
  - GitHub Pages host detection & `null` API base URL without override
  - Repository-relative static JSON resolution under `/` and `/internships/` (with/without trailing slash)
  - Localhost API routing (`http://localhost:5000/api` / `/api`) and `window.__API_BASE_URL__` override
  - Preservation of all 5 official records (`INT-101`–`INT-105`, 9 openings, 4 domains, 3 Remote)
  - Valid empty `[]` dataset handling, malformed payload rejection, unsafe URL (`javascript:`) rejection
  - Two-page routing & monochrome CSS integrity verification (zero purple hex codes)
  - Search, filters, sorting, and client-side application validation

---

## 2. Browser End-to-End, Responsive, Accessibility & Performance Evidence

Executed via headless Google Chrome (Chrome DevTools Protocol) against local full-stack Express + SQLite + static portal:

- **Two-Page Flow**:
  - Landing Page (`/`): `The Next Layer of Intelligence | InternBoard`, black canvas (`rgb(0, 0, 0)`), MP4 full-bleed background video (`muted`, `loop`, `aria-hidden="true"`), 4 partner placeholder marks, desktop nav (`About`, `Features`, `FAQ`, `Contact`), mobile overlay menu toggle + `Escape` dismissal.
  - Clicking `Get Started` navigates to `/internships/` cleanly; direct browser reload preserves the page.
- **Monochrome Portal (`/internships/`)**:
  - Background: `rgb(255, 255, 255)`, primary CTA background: `rgb(5, 5, 5)` with `rgb(255, 255, 255)` text.
  - Cards rendered: `5` (`INT-101`–`INT-105`), Stats: `5` internships, `9` openings, `4` domains, `3` remote, `N/A` paid (`Not provided in official dataset`).
  - Details Modal & Application Modal: keyboard navigation (`Escape` closes & restores focus to trigger button), initial modal alerts/spinner/receipt evaluate to `display: none`, valid submit stores record & renders real `APP-...` receipt.
- **Responsive Overflow Check (0 Horizontal Overflow Across All 8 Widths on BOTH Pages)**:
  - Tested `360px`, `375px`, `390px`, `430px`, `768px`, `1024px`, `1280px`, `1440px`: `scrollWidth <= innerWidth` passed at every width on `/` and `/internships/`.
- **Accessibility Checks Performed**:
  - Single `<h1>` on each page (`h1Count: 1`).
  - Zero unlabeled form inputs (`unlabeledInputs: []` across search, filters, hidden ID, fullName, email, coverLetter).
  - Visible focus rings (`:focus-visible` `2px`/`3px` solid high-contrast border), `Escape` closes modals and mobile menus with focus restoration, `role="dialog"` + `aria-modal="true"`, `role="alert"` + `aria-live="polite"`, background video marked `aria-hidden="true"` and `pointer-events: none`.
  - Contrast: monochrome `#080808` and `#666666` on `#FFFFFF` provide `19.6:1` and `5.74:1` contrast respectively; `#FFFFFF` on `#050505` buttons provides `20.3:1`. *(Manual screen-reader voiceover walk-through recommended as final human review; automated checks do not represent formal WCAG certification.)*
- **Measured Browser Performance (Local Chrome Navigation Timing on `/internships/`)**:
  - `domContentLoadedEventEnd`: **255 ms**
  - `loadEventEnd`: **357 ms**
  - Console errors: **0** | Uncaught page errors: **0**
  - *(Note: Formal Google Lighthouse CLI score was not separately generated in this terminal session; real Chrome Navigation Timing & asset transfer were measured directly via CDP.)*

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

- `landing-desktop-1440.png` — Dark cinematic landing page at `1440x900`
- `landing-mobile-360.png` — Mobile cinematic landing stage at `360x800`
- `portal-desktop-1440.png` — Monochrome white & black InternBoard portal at `1440x900`
- `portal-mobile-360.png` — Mobile responsive stats & cards at `360x800`
- `portal-application-modal.png` — Clean monochrome application modal (`INT-101`)
- `portal-application-receipt.png` — Confirmed submission receipt with server-generated `APP-...` ID
