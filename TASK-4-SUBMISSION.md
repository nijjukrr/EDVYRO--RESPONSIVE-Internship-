# Task 4 Submission — InternBoard Production-Ready Capstone

**Track:** Full Stack Development  
**Task:** TASK-4 — Production-Ready Capstone  
**Project:** InternBoard — Responsive Internship Board and REST API

## Project summary

InternBoard is a student-facing internship board built with a responsive HTML/CSS/JavaScript frontend and a Node.js/Express REST API backed by SQLite. The supplied five internship records and their original IDs are preserved.

## Implemented user journey

- Browse the five supplied internship records.
- Search internships and filter by domain and work mode.
- Inspect internship details.
- Open an accessible application dialog and submit an application.
- Receive a success receipt only after the API confirms persistence.
- See loading, empty, error, and retry states for internship data.

## Architecture

- **Frontend:** semantic HTML, CSS, vanilla JavaScript ES modules.
- **Backend:** Node.js, Express, Helmet, express-rate-limit.
- **Database:** SQLite with parameterized SQL, foreign keys, unique constraints, and rerunnable seed data.
- **API contract:** JSON responses use `status`, `data`, and pagination metadata for list responses.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database health check |
| GET | `/api/internships?page=1&limit=10` | Paginated internship listing |
| GET | `/api/internships/:id` | Internship details |
| POST | `/api/internships` | Create internship |
| PUT | `/api/internships/:id` | Update internship |
| DELETE | `/api/internships/:id` | Delete internship |
| POST | `/api/applications` | Submit an application |

## Validation and security controls

- Server-side validation rejects missing/blank applicant names and malformed email addresses.
- Optional portfolio links must be absolute HTTP or HTTPS URLs, must not contain embedded credentials, and are limited to 2,048 characters. Schemes such as `javascript:`, `data:`, and `file:` are rejected.
- Duplicate applications for the same internship and normalized email are rejected with HTTP 409; the database also enforces uniqueness.
- Application writes use parameterized SQL.
- Helmet adds security headers and the application endpoint is rate-limited.
- Structured logs avoid applicant names, email addresses, portfolio URLs, cover letters, passwords, and tokens.
- The SQLite schema is migrated safely to add the optional `portfolio_url` column to existing databases.

## Local setup

Requirements: Node.js 18 or newer and npm.

```bash
git clone https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-.git
cd EDVYRO--RESPONSIVE-Internship-
cd backend
npm ci
cp .env.example .env
npm run init-db
npm run seed
npm start
```

Open `http://localhost:5000`. The API health check is available at `http://localhost:5000/api/health`.

Environment variables are documented in `backend/.env.example`. Do not commit real credentials or production secrets.

## Automated tests

Run frontend tests from the repository root:

```bash
node --test tests/frontend.test.mjs
```

Run backend tests from `backend/`:

```bash
npm ci
npm test
```

The frontend suite currently has 17 tests. Backend test results must be recorded from a successful run in the target environment; do not treat a test count written in documentation as proof of execution.

## Accessibility and responsive evidence

Evidence screenshots are stored in:

- `screenshots/desktop-1440.png`
- `screenshots/tablet-768.png`
- `screenshots/mobile-360.png`
- `screenshots/empty-state.png`
- `screenshots/error-state.png`
- `screenshots/modal-details.png`

Review keyboard operation, visible focus, modal focus trapping, form labels and error announcements, contrast, and horizontal overflow at a 360px viewport before final submission. Record the actual results in the audit report.

## Deployment and walkthrough

- **Frontend deployment:** GitHub Pages static demo (frontend only).
- **Backend deployment:** Pending. The GitHub Pages static host cannot run Express or SQLite; configure a hosted API and set the frontend API base URL before claiming live application submission works.
- **Two-minute walkthrough:** Pending recording. Use `docs/evidence/WALKTHROUGH_SCRIPT.md` as the recording outline.

## Reviewer verification

1. Open this public repository in a private/incognito browser window.
2. Confirm the README, source code, backend, tests, screenshots, and this Task-4 document are accessible without signing in.
3. Follow the local setup commands and run both test suites.
4. If a backend deployment is added, verify `GET /api/health` and submit a test application using a dedicated test email address.
5. Submit this repository URL in the EdVyro dashboard:

   https://github.com/nijjukrr/EDVYRO--RESPONSIVE-Internship-

