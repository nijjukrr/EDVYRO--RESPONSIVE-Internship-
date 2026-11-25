# InternBoard — Responsive Internship Board

> **EdVyro Full Stack Development Internship – Task 2**  
> A responsive, accessible internship discovery platform built entirely with semantic **HTML5**, modern **CSS3**, and modular **Vanilla JavaScript (ES6+)** with zero frontend frameworks.

---

## 1. Project Overview

**InternBoard** is a clean, production-structured web application that lets students explore internship opportunities, search across titles, domains, skills, and locations, combine multiple filters, inspect full role details in a keyboard-accessible modal, and browse comfortably across mobile, tablet, and desktop screens.

---

## 2. Problem Statement

Students searching for early-career internships often encounter cluttered job boards that mix unverified information, lack clear skill tags, or fail on mobile devices and keyboard-only navigation. InternBoard solves this by presenting structured internship records from a validated JSON dataset in a fast, distraction-free, responsive, and accessible interface.

---

## 3. Features

- **Dynamic Dataset Loading & Validation**: Fetches and validates records from `data/internships.json` (sourced from the official EdVyro sample dataset) without fabricating missing fields.
- **Live Statistics Dashboard**: Automatically calculates Total Internships, Total Openings, Available Domains, Remote Opportunities, and Paid Opportunities from the loaded dataset.
- **Case-Insensitive Search**: Searches across internship title, company (if provided), description (if provided), domain, required skills, location, and ID, trimming extra whitespace and syncing the Hero search bar with the Listing search bar.
- **Combined Multi-Filter & Sorting Controls**: Filter simultaneously by **Domain**, **Work Mode** (`Remote`, `Hybrid`, `On-site`), and **Stipend** (`All`, `Paid`, `Unpaid`, `Not Specified`), and sort by Default Order, Title (`A–Z` / `Z–A`), Openings (`High to Low` / `Low to High`), or Domain (`A–Z`).
- **Accessible Details Modal**: Opens a `role="dialog"` (`aria-modal="true"`) modal displaying metadata, description, responsibilities, required skills, eligibility, and application status, with focus trapping, `Escape`-key closing, backdrop closing, and focus restoration to the triggering button.
- **Empty & Error States**: Displays a helpful empty state (`"No internships found."`) with **Clear Filters** / **Reset Search** actions, plus a recoverable error state with console diagnostics and a **Retry** button when data loading fails.
- **Responsive Mobile Navigation**: Sticky header with a keyboard-accessible hamburger menu (`aria-expanded`, `aria-controls`, `Escape`-key dismissal).

---

## 4. Technology Stack

- **HTML5**: Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`), explicit form labels, and ARIA attributes.
- **CSS3**: Custom properties (`:root` variables), CSS Grid, Flexbox, sticky header, `prefers-reduced-motion` support, and multi-breakpoint responsive styles (`css/style.css` + `css/responsive.css`).
- **Vanilla JavaScript (ES6+)**: Modular ES6 architecture (`js/app.js`, `js/data.js`, `js/validation.js`, `js/filters.js`, `js/ui.js`) using safe DOM APIs (`createElement`, `textContent`) to prevent HTML injection.
- **Data**: JSON (`data/internships.json`) preserving the official EdVyro sample records (`INT-101` through `INT-105`).

*Zero frameworks or UI libraries are used (no React, Vue, Angular, Next.js, Bootstrap, or Tailwind CSS).*

---

## 5. Project Folder Structure

```text
.
├── index.html
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── data.js
│   ├── filters.js
│   ├── ui.js
│   └── validation.js
├── data/
│   └── internships.json
├── assets/
│   └── images/
│       ├── hero-illustration.svg
│       └── logo.svg
├── screenshots/
│   ├── desktop-1440.png
│   ├── listings-desktop.png
│   ├── modal-details.png
│   ├── empty-state.png
│   ├── error-state.png
│   ├── tablet-768.png
│   └── mobile-360.png
├── .gitignore
└── README.md
```

*(Note: Entry files are placed at the repository root so GitHub Pages and Netlify can deploy directly from the `main` branch root without extra path configuration.)*

---

## 6. Installation Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-.git
   cd EDVYRO--RESPONSIVE-Internship-
   ```
2. No `npm install` or build step is required because the project uses pure HTML, CSS, and native ES6 modules.

---

## 7. How to Run Locally

Because the application loads `data/internships.json` via `fetch()` and uses `<script type="module">`, run it through a local static HTTP server rather than opening `index.html` over `file://`:

- **Option A — VS Code Live Server**: Right-click `index.html` and select **Open with Live Server**.
- **Option B — Python**:
  ```bash
  python -m http.server 8080
  ```
  Then open `http://localhost:8080` in your browser.
- **Option C — Node.js**:
  ```bash
  npx serve .
  ```

---

## 8. How Search and Filters Work

1. **Validation (`js/validation.js`)**: `validateDataset()` and `validateInternship()` check required fields (`id`, `title`, `domain`, `mode`, `location`, `skills`), normalize whitespace, sanitize any optional `http:`/`https:` `applicationUrl`, and leave omitted optional fields as `null` instead of fabricating values.
2. **Search (`searchInternships`)**: Trims leading/trailing whitespace, converts the query to lowercase, and checks `id`, `title`, `company`, `description`, `domain`, `location`, `mode`, and every entry in `skills`.
3. **Composable Filters (`applyAllFilters`)**: Chains `searchInternships()` → `filterByDomain()` → `filterByWorkMode()` → `filterByStipend()` → `sortInternships()` on immutable copies of the dataset so every filter updates simultaneously with the search bar and live results counter.

---

## 9. Accessibility Features

- **Skip Link**: `"Skip to main content"` link visible on keyboard focus.
- **Semantic Landmarks & Headings**: Single `<h1>` in the hero followed by ordered `<h2>` and `<h3>` headings.
- **Explicit Form Labels**: Every `<input>` and `<select>` element has a matching `<label for="...">`.
- **Keyboard Navigation & Focus Management**:
  - Visible `:focus-visible` outlines across links, buttons, inputs, and selects.
  - Modal traps `Tab` and `Shift+Tab` inside the dialog, closes on `Escape`, and returns focus to the triggering **View Details** button.
  - Mobile hamburger menu updates `aria-expanded` and closes on `Escape`.
- **Live Announcements**: `#results-count` uses `aria-live="polite"` to announce updated match counts.
- **Reduced Motion**: Honors `@media (prefers-reduced-motion: reduce)`.

---

## 10. Responsive Design Details

Tested across mobile, tablet, and desktop viewports with zero horizontal overflow (`scrollWidth <= innerWidth`):

- **Mobile (`360px`, `375px`, `390px`, `430px`)**: Single-column card layout, collapsible hamburger navigation drawer, stacked hero search bar and card action footer, touch-friendly `>= 44px` controls.
- **Tablet (`768px`, `1024px`)**: Two-column statistics and listing grid, multi-row filter controls.
- **Desktop (`1280px`, `1440px`, `1920px`)**: Three-column internship card grid, four-column statistics bar, and single-row five-control search/filter panel inside a `1240px` max-width container.

---

## 11. Testing & Verification Results

All tests have been executed and verified using Node.js test suites and headless Chrome DevTools Protocol (CDP) automation across both the local server and the live GitHub Pages deployment.

### Functional Verification
- **Dataset Loading**: 5/5 valid records loaded from `data/internships.json` (`INT-101` through `INT-105`) with 0 schema validation errors.
- **Dynamic Statistics**: Calculated dynamically from dataset: 5 active listings, 9 total openings, 4 unique domains, 3 remote opportunities, 0 paid (accurately reflects dataset where stipend values are not specified).
- **Search Verification**: Case-insensitive and trimmed search tested (`"  JAVASCRIPT "` returns `INT-101`, `"sql"` returns `INT-102` & `INT-104`, nonexistent terms display empty state). Hero search input and listing search input are fully synchronized.
- **Domain & Mode Filtering**: Multiple simultaneous filter conditions tested (`Full Stack Development` + `Hybrid` returns `API Engineering Intern` `INT-102`).
- **Sorting**: Verified `Title (A–Z)`, `Title (Z–A)`, `Openings (High to Low)`, and `Openings (Low to High)`.
- **Clear Filters**: Restores full 5-card list, clears search inputs, and resets all dropdowns.
- **Empty State**: Displays `"No internships found."` with active **Clear Filters** and **Reset Search** buttons.
- **Error & Recovery State**: Simulated HTTP 500 error triggers error card with diagnostic message; clicking **Retry** successfully re-fetches and renders all listings.
- **Modal & Accessibility**:
  - Details modal displays all metadata, responsibilities, required skills, and clear application status without fabricating missing URLs.
  - Initial focus moves to the top close button (`#modal-close-top`).
  - Focus is trapped within modal interactive elements.
  - Pressing `Escape` closes the modal and restores keyboard focus to the triggering **View Details** button.
- **Form Accessibility**: 100% of `<input>` and `<select>` controls have explicit, programmatic `<label for="...">` associations.
- **Zero Console Errors**: 0 uncaught exceptions and 0 network/console errors during standard operation.

### Responsive Viewport Verification (Zero Horizontal Overflow)
- **360px** (Small mobile): Passed (`scrollWidth <= innerWidth`), collapsible mobile hamburger menu verified.
- **375px** (iPhone SE): Passed (`scrollWidth <= innerWidth`).
- **390px** (iPhone 12/13/14): Passed (`scrollWidth <= innerWidth`).
- **430px** (iPhone 14 Pro Max): Passed (`scrollWidth <= innerWidth`).
- **768px** (Tablet portrait): Passed (`scrollWidth <= innerWidth`), 2-column stats and card layouts.
- **1024px** (Tablet landscape / small laptop): Passed (`scrollWidth <= innerWidth`).
- **1280px** (Desktop standard): Passed (`scrollWidth <= innerWidth`), 3-column card grid.
- **1440px** (Desktop large): Passed (`scrollWidth <= innerWidth`).
- **1920px** (Full HD desktop): Passed (`scrollWidth <= innerWidth`).

---

## 12. Screenshots

| Desktop Hero & Stats (`1440px`) | Desktop Listings (`1440px`) |
| --- | --- |
| ![Desktop Hero](screenshots/desktop-1440.png) | ![Desktop Listings](screenshots/listings-desktop.png) |

| Details Modal | Empty State | Error State |
| --- | --- | --- |
| ![Details Modal](screenshots/modal-details.png) | ![Empty State](screenshots/empty-state.png) | ![Error State](screenshots/error-state.png) |

| Tablet (`768px`) | Mobile (`360px`) |
| --- | --- |
| ![Tablet View](screenshots/tablet-768.png) | ![Mobile View](screenshots/mobile-360.png) |

---

## 13. Deployment & Live URLs

- **Live Deployed Website**: [https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/](https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/) *(Verified HTTP 200 on GitHub Pages)*
- **GitHub Repository**: [https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-](https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-)
- **Deployment Source**: Branch `main`, Directory `/ (root)`

---

## 14. Deployment Instructions (GitHub Pages & Netlify)

### Pushing Updates to GitHub

```bash
git add .
git commit -m "Update documentation or features"
git push origin main
```

### GitHub Pages Configuration

1. Open your repository on GitHub: `https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-`
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Click **Save**. GitHub Pages automatically builds and deploys to `https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/`.

### Alternative: Deploy on Netlify

1. Log in to [Netlify](https://www.netlify.com/) and choose **Add new site → Import an existing project**.
2. Connect your GitHub repository (`EDVYRO--RESPONSIVE-Internship-`).
3. Set build command to empty and publish directory to `.` (root).
4. Click **Deploy site**.

---

## 15. Future Improvements

- Add pagination or lazy loading if the dataset grows to hundreds of listings.
- Support bookmarking/saving favorite internships in `localStorage`.
- Add URL query parameter synchronization so filtered views can be shared directly via link.
- Add optional dark mode toggle using CSS custom properties.

---

# Task 3 — REST API and Persistent Data

## 1. Backend Overview

EdVyro Task 3 expands the InternBoard project with a production-structured backend built in **Node.js** and **Express.js**, backed by a persistent **SQLite** database (`backend/database/internships.db`).

The API provides full CRUD capabilities, pagination, centralized input validation, parameterized SQL statements, and strict JSON response contracts across all endpoints.

---

## 2. Technology Stack

- **Runtime**: Node.js (v18.0.0+)
- **Backend Framework**: Express.js (v4.21+)
- **Database Engine**: SQLite 3 (file-based persistent storage)
- **Database Driver**: `better-sqlite3` (synchronous, high-performance, parameterized SQL)
- **Configuration**: `dotenv`
- **Testing Framework**: Node.js native test runner (`node:test`, `node:assert/strict`) and `supertest`

---

## 3. Database Schema

The database table `internships` is defined in [`backend/database/schema.sql`](backend/database/schema.sql):

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(id)) > 0),
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  domain TEXT NOT NULL CHECK(length(trim(domain)) > 0),
  mode TEXT NOT NULL CHECK(mode IN ('Remote', 'Hybrid', 'On-site')),
  location TEXT NOT NULL CHECK(length(trim(location)) > 0),
  skills TEXT NOT NULL CHECK(json_valid(skills)),
  openings INTEGER NOT NULL CHECK(openings >= 0),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_internships_domain ON internships(domain);
CREATE INDEX IF NOT EXISTS idx_internships_mode ON internships(mode);
```

### Table Columns & Constraints
- **`id`** (`TEXT PRIMARY KEY`): Unique non-empty string identifier (e.g. `INT-101`).
- **`title`** (`TEXT NOT NULL`): Role title (cannot be empty or whitespace).
- **`domain`** (`TEXT NOT NULL`): Technical track/domain.
- **`mode`** (`TEXT NOT NULL`): Allowed values: `'Remote'`, `'Hybrid'`, or `'On-site'`.
- **`location`** (`TEXT NOT NULL`): Location string (e.g. `India`, `Pune`, `Bengaluru`).
- **`skills`** (`TEXT NOT NULL`): Valid JSON array in SQLite, parsed into a native array for API clients.
- **`openings`** (`INTEGER NOT NULL`): Non-negative integer (`>= 0`).
- **`created_at`** / **`updated_at`** (`TEXT NOT NULL`): UTC timestamps automatically managed with `CURRENT_TIMESTAMP`.

---

## 4. Official Seed Records (Preserved Data)

The seed script strictly preserves the five official EdVyro sample records:

| ID | Title | Domain | Work Mode | Location | Openings | Skills |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `INT-101` | Frontend Intern | Full Stack Development | Remote | India | 3 | HTML, CSS, JavaScript |
| `INT-102` | API Engineering Intern | Full Stack Development | Hybrid | Pune | 2 | Node.js, SQL, Testing |
| `INT-103` | UI/UX Intern | UI/UX | Remote | India | 1 | Figma, Research, Accessibility |
| `INT-104` | Data Analyst Intern | Data Analytics | On-site | Bengaluru | 2 | Excel, SQL, Data visualisation |
| `INT-105` | Security Operations Intern | Cyber Security | Remote | India | 1 | Linux, Logs, Networking |

The seed script (`backend/database/seed.js`) is **safe to rerun**: it uses idempotent checks (`SELECT id FROM internships WHERE id = ?`) so it never creates duplicates or silently overwrites user modifications.

---

## 5. Backend Folder Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── database.js          # SQLite connection and migration runner
│   ├── controllers/
│   │   └── internshipController.js # HTTP request/response handlers
│   ├── middleware/
│   │   ├── errorHandler.js      # Centralized error responses
│   │   └── validateRequest.js   # Request validation middleware
│   ├── routes/
│   │   └── internshipRoutes.js  # REST endpoint definitions
│   ├── services/
│   │   └── internshipService.js # Business logic and parameterized SQL
│   ├── validators/
│   │   └── internshipValidator.js # Schema validation rules
│   ├── app.js                   # Express application setup
│   └── server.js                # Server entrypoint and startup
├── database/
│   ├── schema.sql               # SQLite schema definition
│   ├── seed.js                  # Safe idempotent seed script
│   └── init.js                  # Schema initialization runner
├── tests/
│   └── internships.test.js      # Automated unit, integration & persistence tests
├── .env.example                 # Safe environment configuration template
├── package.json                 # Backend dependencies and scripts
└── README.md                    # Standalone backend documentation
```

---

## 6. Installation & Local Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Environment Setup
Create your local environment file from `.env.example`:
```bash
cp .env.example .env
```
Default contents:
```env
PORT=5000
NODE_ENV=development
DATABASE_PATH=./database/internships.db
```

### Step 3: Initialize Database & Seed
```bash
npm run init-db
```
To run only the seed script at any time:
```bash
npm run seed
```

### Step 4: Start the API
- **Production mode**:
  ```bash
  npm start
  ```
- **Development mode** (auto-restart with Node watch):
  ```bash
  npm run dev
  ```
The API is live at `http://localhost:5000`.

### Step 5: Run Automated Tests
```bash
npm test
```
Runs all 26 automated tests in an isolated temporary database.

---

## 7. API Response Contract

### Success Response Envelope
```json
{
  "status": "success",
  "data": {}
}
```

### Paginated Success Response Envelope
```json
{
  "status": "success",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 5,
    "totalPages": 1
  }
}
```

### Error Response Envelope
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

No raw database errors, SQL queries, file paths, or stack traces are returned to API clients.

---

## 8. REST Endpoints & curl Examples

### A. Health Check
- **`GET /api/health`**
- Verifies API and SQLite database connectivity.
```bash
curl -s http://localhost:5000/api/health
```
Response (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "api": "running",
    "database": "connected"
  }
}
```

### B. List Internships (Paginated)
- **`GET /api/internships`**
- Supports `page` (default `1`) and `limit` (default `10`, max `100`).
```bash
curl -s "http://localhost:5000/api/internships?page=1&limit=2"
```
Response (`200 OK`):
```json
{
  "status": "success",
  "data": [
    {
      "id": "INT-101",
      "title": "Frontend Intern",
      "domain": "Full Stack Development",
      "mode": "Remote",
      "location": "India",
      "skills": ["HTML", "CSS", "JavaScript"],
      "openings": 3,
      "created_at": "2026-11-25 05:28:00",
      "updated_at": "2026-11-25 05:28:00"
    },
    {
      "id": "INT-102",
      "title": "API Engineering Intern",
      "domain": "Full Stack Development",
      "mode": "Hybrid",
      "location": "Pune",
      "skills": ["Node.js", "SQL", "Testing"],
      "openings": 2,
      "created_at": "2026-11-25 05:28:00",
      "updated_at": "2026-11-25 05:28:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "totalRecords": 5,
    "totalPages": 3
  }
}
```

### C. Get Single Internship
- **`GET /api/internships/:id`**
```bash
curl -s http://localhost:5000/api/internships/INT-101
```
Response (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "id": "INT-101",
    "title": "Frontend Intern",
    "domain": "Full Stack Development",
    "mode": "Remote",
    "location": "India",
    "skills": ["HTML", "CSS", "JavaScript"],
    "openings": 3,
    "created_at": "2026-11-25 05:28:00",
    "updated_at": "2026-11-25 05:28:00"
  }
}
```
If ID is not found (`404 Not Found`):
```json
{
  "status": "error",
  "message": "Internship with ID 'INT-999' not found",
  "errors": []
}
```

### D. Create Internship
- **`POST /api/internships`**
```bash
curl -s -X POST http://localhost:5000/api/internships \
  -H "Content-Type: application/json" \
  -d '{
    "id": "INT-106",
    "title": "DevOps Engineering Intern",
    "domain": "Cloud Computing",
    "mode": "Remote",
    "location": "India",
    "skills": ["Docker", "Kubernetes", "CI/CD"],
    "openings": 2
  }'
```
Response (`201 Created`):
```json
{
  "status": "success",
  "data": {
    "id": "INT-106",
    "title": "DevOps Engineering Intern",
    "domain": "Cloud Computing",
    "mode": "Remote",
    "location": "India",
    "skills": ["Docker", "Kubernetes", "CI/CD"],
    "openings": 2,
    "created_at": "2026-11-25 05:35:00",
    "updated_at": "2026-11-25 05:35:00"
  }
}
```
Duplicate ID Response (`409 Conflict`):
```json
{
  "status": "error",
  "message": "Internship with ID 'INT-101' already exists",
  "errors": [
    {
      "field": "id",
      "message": "Internship with ID 'INT-101' already exists"
    }
  ]
}
```

### E. Update Internship
- **`PUT /api/internships/:id`**
```bash
curl -s -X PUT http://localhost:5000/api/internships/INT-101 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Frontend Intern",
    "domain": "Full Stack Development",
    "mode": "Remote",
    "location": "India & Global",
    "skills": ["HTML5", "CSS3", "JavaScript", "TypeScript"],
    "openings": 4
  }'
```
Response (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "id": "INT-101",
    "title": "Senior Frontend Intern",
    "domain": "Full Stack Development",
    "mode": "Remote",
    "location": "India & Global",
    "skills": ["HTML5", "CSS3", "JavaScript", "TypeScript"],
    "openings": 4,
    "created_at": "2026-11-25 05:28:00",
    "updated_at": "2026-11-25 05:36:10"
  }
}
```

### F. Delete Internship
- **`DELETE /api/internships/:id`**
```bash
curl -s -X DELETE http://localhost:5000/api/internships/INT-106
```
Response (`200 OK`):
```json
{
  "status": "success",
  "message": "Internship with ID 'INT-106' deleted successfully",
  "data": null
}
```

---

## 9. Automated Test Verification

Automated tests verified using Node.js native test runner:
- **Total Tests**: 26
- **Passed**: 26
- **Failed**: 0
- **Skipped**: 0
- **Execution Time**: ~520ms

### Verified Test Scenarios
1. **Health Check & Index**: `GET /api/health` returns `api: running, database: connected`; root returns index; unknown route returns 404.
2. **List Records**: `GET /api/internships` returns all 5 seeded records with complete pagination metadata.
3. **Pagination Mechanics**: Correct page slicing (`page=1&limit=2`, `page=3&limit=2`), out-of-range returns empty array.
4. **Pagination Validation**: Rejects `page=0`, `page=-3`, `page=abc`, and `limit > 100` with HTTP 400.
5. **Get by ID**: Returns 200 with record for valid ID; returns 404 with error contract for nonexistent ID.
6. **Create Record**: Returns 201 with created record; rejects duplicate ID with 409; rejects missing title, missing domain, invalid mode, invalid skills type, negative openings, and malformed JSON with HTTP 400.
7. **Update Record**: Returns 200 with updated record; returns 404 for unknown ID; rejects attempt to modify record ID with 400; rejects missing required fields with 400.
8. **Delete Record**: Returns 200 after deleting existing record; subsequent GET returns 404; deleting unknown ID returns 404.
9. **Database Persistence**: Creates record in SQLite, fully closes database connection, reopens connection to the same database file without re-seeding, and proves the record exists and retains all fields.

---

## 10. Known Limitations & Architecture Notes

1. **Embedded SQLite Database**: SQLite is designed for embedded and single-instance deployments. It provides high performance and zero configuration for portfolios, development, and single-server environments. If scaled to a multi-container cluster across multiple cloud availability zones, a client-server database like PostgreSQL would be recommended.
2. **Task 2 Frontend Decoupling**: The Task 2 frontend deployed on GitHub Pages remains independently functional via static JSON loading. Because GitHub Pages does not run backend Node.js servers, client-server integration is decoupled to maintain 100% uptime on the live GitHub Pages website. Full live full-stack deployment is designated for later internship tasks.

