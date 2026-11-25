# InternBoard Backend — REST API and Persistent Data

> **EdVyro Full Stack Development Internship — Task 3**  
> A production-structured Node.js and Express REST API backed by persistent SQLite storage, parameterized SQL queries, centralized input validation, and predictable response contracts.

---

## 1. Backend Overview

This backend provides a complete REST API for managing internship records. It persists data in a local SQLite database (`backend/database/internships.db`), guarantees referential integrity and database constraints, handles pagination, enforces strict JSON schema validation, and returns predictable response envelopes for all success and error scenarios.

---

## 2. Technology Stack

- **Runtime**: Node.js (v18.0.0+)
- **Web Framework**: Express.js (v4.21+)
- **Database Engine**: SQLite 3 (persistent file-based storage)
- **Database Driver**: `better-sqlite3` (synchronous, high-performance, parameterized queries)
- **Environment Management**: `dotenv`
- **Testing Framework**: Node.js built-in test runner (`node:test`, `node:assert/strict`) with `supertest`

---

## 3. Database Schema

The SQLite schema is defined in [`database/schema.sql`](./database/schema.sql):

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

### Constraints & Types
- **`id`**: Primary key string (2–50 chars, e.g. `INT-101`). Unique and non-empty.
- **`title`**, **`domain`**, **`location`**: Non-empty trimmed strings.
- **`mode`**: Restricted to `'Remote'`, `'Hybrid'`, or `'On-site'`.
- **`skills`**: Valid JSON array string in database; returned as native array in API responses.
- **`openings`**: Non-negative integer (`>= 0`).
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

## 10. Actual Test Results

Automated tests run on Node.js test runner:
- **Total Tests**: 26
- **Passed**: 26
- **Failed**: 0
- **Skipped**: 0
- **Duration**: ~520ms

### Verified Test Areas
1. Health check & root API index
2. Read all 5 seeded official records
3. Pagination (`page=1&limit=2`, `page=3&limit=2`, out-of-range pages)
4. Pagination query validation (reject non-integers, negative numbers, `limit > 100`)
5. Get single internship by valid ID and 404 for invalid ID
6. Create valid record (`201 Created`)
7. Create reject missing title, missing domain, invalid mode, invalid skills type, negative openings, malformed JSON
8. Duplicate ID rejection (`409 Conflict`)
9. Update valid record (`200 OK`) and 404 for nonexistent ID
10. Update reject body attempting to modify ID (`400 Bad Request`)
11. Update reject missing required fields
12. Delete existing record (`200 OK`) and subsequent GET verification (`404 Not Found`)
13. Delete unknown ID (`404 Not Found`)
14. Database persistence: record verified to survive complete database connection shutdown and reopen without re-seeding

---

## 11. Known Limitations

- **Single-Node SQLite Storage**: SQLite is an embedded single-node database. While ideal for local development, portfolios, and single-instance deployments, high-concurrency multi-node clusters would require a client-server database like PostgreSQL.
- **Frontend Decoupling**: In accordance with Task 3 scope, the frontend on GitHub Pages continues to read verified records from `data/internships.json` because GitHub Pages does not run backend Node.js processes. Full client-server integration is scheduled for later internship tasks.
