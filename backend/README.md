# InternBoard Backend — REST API and Persistent Data

> **EdVyro Full Stack Development Internship — Task 3**  
> A production-structured Node.js and Express REST API backed by persistent SQLite storage, parameterized SQL queries, centralized input validation, and predictable response contracts.

---

## 1. Backend Overview

This backend provides a complete REST API for managing internship records. It persists data in a local SQLite database (`backend/database/internships.db`), guarantees referential integrity and database constraints, handles pagination, enforces strict JSON schema validation, and returns predictable response envelopes for all success and error scenarios.

---

## 2. Technology Stack

- **Runtime**: Node.js (`>=18.0.0`)
- **Web Framework**: Express.js (`^4.21.2`)
- **Database Engine**: SQLite 3 (persistent file-based storage)
- **Database Driver**: `better-sqlite3` (`^11.8.1`, synchronous, parameterized queries)
- **Security Middleware**: `helmet` (`^8.3.0`) for HTTP response header hardening
- **Rate Limiting**: `express-rate-limit` (`^8.7.5`) for DDoS/spam mitigation on submissions
- **CORS Support**: Deliberate origin allowlist middleware in `src/app.js`
- **Environment Management**: `dotenv` (`^16.4.7`)
- **Testing Framework**: Node.js built-in test runner (`node:test`, `node:assert/strict`) with `supertest` (`^7.0.0`)

---

## 3. Database Schema

The SQLite schema is defined in [`database/schema.sql`](./database/schema.sql):

```sql
PRAGMA foreign_keys = ON;

-- Internships Table (Task 3)
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

-- Applications Table (Task 4)
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL,
  internship_id TEXT NOT NULL,
  full_name TEXT NOT NULL CHECK(length(trim(full_name)) > 0),
  email TEXT NOT NULL CHECK(length(trim(email)) > 0),
  cover_letter TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  UNIQUE(internship_id, email)
);

CREATE INDEX IF NOT EXISTS idx_applications_internship_id ON applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
```

### Constraints & Types
- **`internships.id`**: Primary key string (2–50 chars, e.g. `INT-101`). Unique and non-empty.
- **`internships.title`**, **`domain`**, **`location`**: Non-empty trimmed strings.
- **`internships.mode`**: Restricted to `'Remote'`, `'Hybrid'`, or `'On-site'`.
- **`internships.skills`**: Valid JSON array string in database; returned as native array in API responses.
- **`internships.openings`**: Non-negative integer (`>= 0`).
- **`applications.id`**: Unique string identifier prefixed with `APP-` and a nanoid token.
- **`applications.internship_id`**: Foreign key pointing to `internships.id` with `ON DELETE CASCADE`.
- **`applications.full_name`**: 2–100 characters trimmed text.
- **`applications.email`**: Validated RFC 5322 lowercase email address.
- **`applications.cover_letter`**: Optional text (up to 1,000 characters).
- **`UNIQUE(internship_id, email)`**: Database constraint strictly preventing duplicate applications for the same role from the same applicant.
- **`created_at`** / **`updated_at`**: Timestamps in UTC `YYYY-MM-DD HH:MM:SS`.

---

## 4. Official Seed Records

The database seed preserves the five official EdVyro sample records without fabricating external URLs, company details, or unverified salaries:

1. **`INT-101`**: Frontend Intern (`Full Stack Development`, `Remote`, `India`, 3 openings)
2. **`INT-102`**: API Engineering Intern (`Full Stack Development`, `Hybrid`, `Pune`, 2 openings)
3. **`INT-103`**: UI/UX Intern (`UI/UX`, `Remote`, `India`, 1 opening)
4. **`INT-104`**: Data Analyst Intern (`Data Analytics`, `On-site`, `Bengaluru`, 2 openings)
5. **`INT-105`**: Security Operations Intern (`Cyber Security`, `Remote`, `India`, 1 opening)

The seed script (`database/seed.js`) is **safe to rerun**: it uses idempotent checks (`SELECT id FROM internships WHERE id = ?`) so it never duplicates records or overwrites user modifications.

---

## 5. Installation & Setup

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Install Dependencies
From the repository root:
```bash
cd backend
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` contents:
```env
PORT=5000
NODE_ENV=development
DATABASE_PATH=./database/internships.db
```

### Initialize Database & Seed
```bash
npm run init-db
```
To run only the seed script at any time:
```bash
npm run seed
```

---

## 6. Running the API

### Start in Production Mode
```bash
npm start
```
Server runs at `http://localhost:5000`.

### Start in Development Mode (Auto-restart on change)
```bash
npm run dev
```

---

## 7. Running Automated Tests

Run the full test suite (26 tests across 7 test suites):
```bash
npm test
```
The test suite automatically spins up an isolated temporary database in the operating system's temp directory and cleans it up after execution. The development database is never touched.

---

## 8. API Response Contract

Every endpoint strictly adheres to predictable JSON envelopes:

### Success Response
```json
{
  "status": "success",
  "data": {}
}
```

### Paginated Success Response
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

### Error Response
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

---

## 9. API Endpoints & curl Examples

### 1. Health Check
- **Method / Path**: `GET /api/health`
- **Description**: Verifies API process and SQLite connection.
- **Status Code**: `200 OK`
- **Example curl**:
  ```bash
  curl -s http://localhost:5000/api/health
  ```
- **Example Response**:
  ```json
  {
    "status": "success",
    "data": {
      "api": "running",
      "database": "connected"
    }
  }
  ```

---

### 2. List Internships (Paginated)
- **Method / Path**: `GET /api/internships`
- **Query Parameters**:
  - `page` (optional, default: `1`, minimum: `1`)
  - `limit` (optional, default: `10`, range: `1` to `100`)
- **Status Code**: `200 OK`
- **Example curl**:
  ```bash
  curl -s "http://localhost:5000/api/internships?page=1&limit=2"
  ```
- **Example Response**:
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

---

### 3. Get Internship by ID
- **Method / Path**: `GET /api/internships/:id`
- **Status Codes**: `200 OK` (found), `404 Not Found` (nonexistent)
- **Example curl**:
  ```bash
  curl -s http://localhost:5000/api/internships/INT-101
  ```
- **Example Success Response**:
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
- **Example 404 Response**:
  ```json
  {
    "status": "error",
    "message": "Internship with ID 'INT-999' not found",
    "errors": []
  }
  ```

---

### 4. Create Internship
- **Method / Path**: `POST /api/internships`
- **Header**: `Content-Type: application/json`
- **Status Codes**: `201 Created`, `400 Bad Request` (validation failed), `409 Conflict` (duplicate ID)
- **Request Body**:
  ```json
  {
    "id": "INT-106",
    "title": "Cloud Architecture Intern",
    "domain": "Cloud Computing",
    "mode": "Remote",
    "location": "India",
    "skills": ["AWS", "Docker", "Terraform"],
    "openings": 2
  }
  ```
- **Example curl**:
  ```bash
  curl -s -X POST http://localhost:5000/api/internships \
    -H "Content-Type: application/json" \
    -d '{"id":"INT-106","title":"Cloud Architecture Intern","domain":"Cloud Computing","mode":"Remote","location":"India","skills":["AWS","Docker","Terraform"],"openings":2}'
  ```
- **Example 201 Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "INT-106",
      "title": "Cloud Architecture Intern",
      "domain": "Cloud Computing",
      "mode": "Remote",
      "location": "India",
      "skills": ["AWS", "Docker", "Terraform"],
      "openings": 2,
      "created_at": "2026-11-25 05:35:00",
      "updated_at": "2026-11-25 05:35:00"
    }
  }
  ```
- **Example 409 Conflict Response**:
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

---

### 5. Update Internship
- **Method / Path**: `PUT /api/internships/:id`
- **Header**: `Content-Type: application/json`
- **Status Codes**: `200 OK`, `400 Bad Request`, `404 Not Found`
- **Request Body**:
  ```json
  {
    "title": "Senior Frontend Intern",
    "domain": "Full Stack Development",
    "mode": "Remote",
    "location": "India & Global",
    "skills": ["HTML5", "CSS3", "JavaScript", "TypeScript"],
    "openings": 4
  }
  ```
- **Example curl**:
  ```bash
  curl -s -X PUT http://localhost:5000/api/internships/INT-101 \
    -H "Content-Type: application/json" \
    -d '{"title":"Senior Frontend Intern","domain":"Full Stack Development","mode":"Remote","location":"India & Global","skills":["HTML5","CSS3","JavaScript","TypeScript"],"openings":4}'
  ```
- **Example 200 Response**:
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

---

### 6. Delete Internship
- **Method / Path**: `DELETE /api/internships/:id`
- **Status Codes**: `200 OK`, `404 Not Found`
- **Example curl**:
  ```bash
  curl -s -X DELETE http://localhost:5000/api/internships/INT-106
  ```
- **Example 200 Response**:
  ```json
  {
    "status": "success",
    "message": "Internship with ID 'INT-106' deleted successfully",
    "data": null
  }
  ```
- **Example 404 Response**:
  ```json
  {
    "status": "error",
    "message": "Internship with ID 'INT-106' not found",
    "errors": []
  }
  ```

---

### 7. Submit Internship Application (Task 4)
- **Method / Path**: `POST /api/applications`
- **Rate Limit**: 10 submissions per 15-minute window per IP (returns `429 Too Many Requests` when exceeded)
- **Status Codes**: `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict`, `429 Too Many Requests`

#### Request Payload Schema
```json
{
  "internshipId": "INT-101",
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "coverLetter": "Passionate frontend developer experienced with Vanilla JS and CSS Grid."
}
```
- **`internshipId`** *(required)*: Existing internship identifier string.
- **`fullName`** *(required)*: 2–100 characters, trimmed.
- **`email`** *(required)*: Valid email format conforming to standard RFC 5322 pattern. Normalized to lowercase.
- **`coverLetter`** *(optional)*: Up to 1,000 characters.

#### Example curl (Success):
```bash
curl -s -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "internshipId": "INT-101",
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "coverLetter": "Excited to apply for Frontend Intern."
  }'
```
Response (`201 Created`):
```json
{
  "status": "success",
  "message": "Application submitted successfully",
  "data": {
    "id": "APP-20261125-9k2x",
    "internshipId": "INT-101",
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "coverLetter": "Excited to apply for Frontend Intern.",
    "createdAt": "2026-11-25 07:45:00"
  }
}
```

#### Example curl (Duplicate Application):
```bash
curl -s -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "internshipId": "INT-101",
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com"
  }'
```
Response (`409 Conflict`):
```json
{
  "status": "error",
  "message": "An application with email 'jane.doe@example.com' has already been submitted for this internship",
  "errors": [
    {
      "field": "email",
      "message": "You have already applied for this internship with this email address"
    }
  ]
}
```

#### Example curl (Validation Failure):
```bash
curl -s -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "internshipId": "INT-101",
    "fullName": "J",
    "email": "invalid-email"
  }'
```
Response (`400 Bad Request`):
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "fullName",
      "message": "Full name must be between 2 and 100 characters"
    },
    {
      "field": "email",
      "message": "Please provide a valid email address (e.g. name@example.com)"
    }
  ]
}
```

#### Example Response (Rate Limit Exceeded — `429 Too Many Requests`):
```json
{
  "status": "error",
  "message": "Too many application submissions from this IP, please try again later",
  "errors": []
}
```

---

## 10. Security Architecture & Controls (Task 4)

1. **Rate Limiting (`express-rate-limit`)**:
   - Targeted on `POST /api/applications` to block rapid automated spam, credential stuffing, and bot submissions.
   - Configured via environment variables:
     - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: `900000` = 15 minutes).
     - `RATE_LIMIT_MAX`: Max submissions per window per IP (default: `10`).
   - Normal browsing endpoints (`GET /api/internships`, `GET /api/internships/:id`) remain unaffected so honest users can continue exploring listings.

2. **Secure HTTP Headers (`helmet`) & Deliberate CORS Allowlist**:
   - Uses `helmet` (v8.3.0) on all Express routes (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control: off`, `Strict-Transport-Security`, `Cross-Origin-Resource-Policy: cross-origin`).
   - CORS explicitly permits `localhost` / `127.0.0.1` ports, `https://nijjukrr.github.io`, and any origins in `process.env.CORS_ORIGINS`; untrusted external origins are excluded.

3. **Parameterized SQL Queries**:
   - All database reads and writes use `better-sqlite3` prepared statements with positional bind parameters (`?`).
   - Never concatenates user inputs into SQL strings, completely neutralising SQL injection attacks. Verified with malicious payloads (e.g. `'; DROP TABLE applications; --`).

4. **Applicant Data Privacy**:
   - Applicant personal information (`fullName`, `email`, `coverLetter`) is isolated to the `applications` table.
   - Public internship endpoints (`GET /api/internships`, `GET /api/internships/:id`) never expose applicant identities or submission counts.
   - Server logs never output applicant emails, personal identifiers, or sensitive payload details.

5. **Dual-Layer Validation**:
   - Client-side validation in `js/application.js` provides immediate, accessible UI feedback before network dispatch.
   - Server-side validation in `backend/src/validators/applicationValidator.js` ensures that direct API clients (curl, Postman, scripts) cannot bypass validation constraints.

---

## 11. Actual Test Results

Automated test verification executed via Node.js native test runner (`node --test tests/**/*.test.js`):
- **Total Test Suites**: 11
- **Total Tests**: 46
- **Passed**: 46
- **Failed**: 0
- **Skipped**: 0
- **Duration**: ~672ms

### Breakdown of Verified Test Suites

#### Task 3 Tests (27 Tests — All Passing):
1. Health check (`200` with `service: "InternBoard API"`, `503` on DB failure) & root API index & 404 handler
2. Read all 5 seeded official records (`GET /api/internships`)
3. Pagination slicing (`page=1&limit=2`, `page=3&limit=2`, out-of-range pages)
4. Pagination query validation (reject non-integers, negative numbers, `limit > 100`)
5. Single internship query (`GET /api/internships/:id` and 404 handler)
6. Create valid record (`POST /api/internships` -> 201 Created)
7. Create validation rejections (missing title, domain, invalid mode, skills type, negative openings, malformed JSON)
8. Duplicate ID conflict rejection (`409 Conflict`)
9. Update valid record (`PUT /api/internships/:id` -> 200 OK)
10. Update rejection rules (immutable ID, missing required fields, 404 handler)
11. Delete record (`DELETE /api/internships/:id` -> 200 OK and 404 verification)
12. Database persistence verification across complete SQLite connection close and reopen

#### Task 4 & Capstone Tests (19 Tests — All Passing):
1. `creates a valid application and returns HTTP 201 with predictable envelope`
2. `creates a valid application with omitted optional cover letter`
3. `rejects duplicate application (same email for same internship) with HTTP 409`
4. `rejects duplicate application case-insensitively with HTTP 409`
5. `allows same email to apply to a DIFFERENT internship`
6. `rejects missing or empty internship ID with HTTP 400`
7. `rejects non-existent internship ID with HTTP 404`
8. `rejects missing or empty full name with HTTP 400`
9. `rejects invalid email formats with HTTP 400`
10. `rejects cover letter exceeding 1000 characters with HTTP 400`
11. `rejects unexpected or unsupported payload properties with HTTP 400`
12. `verifies Helmet secure HTTP headers are present in responses`
13. `applies deliberate CORS allowlist for local/GitHub Pages origins and excludes untrusted origins`
14. `safely handles SQL injection attempts in fullName and email using parameterized queries`
15. `verifies applicant personal information is NOT leaked through public internship listings`
16. `triggers HTTP 429 Too Many Requests with standard rate-limit headers when exceeded`
17. `confirms rate limiter does NOT block normal internship browsing`
18. `sanitizes PII and secrets in structured operational logger`
19. `persists submitted applications across database connection restarts`

---

## 12. Deployment & Runtime Environment Notes

- **Backend Runtime**: Node.js / Express listening locally on port `5000` (`http://localhost:5000/api`).
- **Database**: Local file-based SQLite database (`backend/database/internships.db`), excluded from git tracking to prevent leaking local runtime state.
- **Frontend Integration**:
  - The static frontend on GitHub Pages ([Live Demo](https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/)) detects `nijjukrr.github.io` and loads verified records directly from `/EDVYRO--RESPONSIVE-Internship-/data/internships.json` without triggering failing API requests or false submission receipts.
  - When the backend is running locally at `http://localhost:5000`, the local frontend communicates directly with the Express REST API (`GET /api/internships` and `POST /api/applications`).
  - The API endpoint can be customized via `window.__API_BASE_URL__` or `localStorage.getItem('INTERNBOARD_API_URL')`.
