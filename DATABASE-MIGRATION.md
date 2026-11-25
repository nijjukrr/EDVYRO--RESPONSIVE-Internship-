# InternBoard — SQLite to Neon PostgreSQL Migration Guide

This document explains how InternBoard safely migrates existing data from the local SQLite database (`backend/database/internships.db`) into Neon PostgreSQL without losing records or modifying the SQLite source.

---

## 1. Safety Guarantees

- **Read-Only Source**: `backend/scripts/migrate-sqlite-to-postgres.js` opens `internships.db` with `{ readonly: true, fileMustExist: true }`. It never deletes, truncates, or mutates SQLite records.
- **Schema Adaptation**: Automatically checks `PRAGMA table_info(applications)` so legacy SQLite files lacking newer optional columns (such as `portfolio_url`) migrate cleanly without altering the source database.
- **Non-Empty Target Protection**: The script inspects both `internships` and `applications` counts inside a PostgreSQL transaction before inserting. If either target table already has rows, it aborts cleanly and makes zero changes.
- **Transactional Atomicity**: Internships are inserted first, applications second, preserving original IDs (`INT-*`, `APP-*`), normalized emails, `portfolio_url`, `cover_letter`, `created_at`, and `updated_at` UTC timestamps. `COMMIT` runs only after count verification and foreign-key orphan checks (`orphans = 0`) succeed.
- **Zero PII Output**: Neither the migration script nor the verification script prints student names, email addresses, portfolio URLs, or cover letters.

---

## 2. Schema Summary (`backend/database/schema.postgres.sql`)

- **`internships`**:
  - `id TEXT PRIMARY KEY` (non-empty)
  - `title`, `domain`, `location` (`TEXT NOT NULL`, non-empty)
  - `mode TEXT NOT NULL CHECK (mode IN ('Remote', 'Hybrid', 'On-site'))`
  - `skills JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(skills) = 'array')`
  - `openings INTEGER NOT NULL CHECK (openings >= 0)`
  - `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **`applications`**:
  - `id TEXT PRIMARY KEY` (non-empty)
  - `internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE RESTRICT`
  - `full_name`, `email` (`TEXT NOT NULL`, non-empty)
  - `portfolio_url`, `cover_letter` (`TEXT`, nullable)
  - `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - Unique case-insensitive index: `idx_applications_unique_role_email ON applications(internship_id, lower(email))`

---

## 3. Running the Migration

1. Configure your Neon pooled connection string in `backend/.env` (never commit `.env`):
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<pooled-host>/<db>?sslmode=require&channel_binding=require
   ```
2. Run the transactional migration from `backend/`:
   ```bash
   npm run migrate:postgres
   ```
   Expected counts:
   - `internships`: `5`
   - `applications`: `3`
   - Foreign-key orphans: `0`

---

## 4. Verifying the Migration (Counts Only)

Run the standalone read-only verification command from `backend/`:

```bash
npm run verify:migration
```

Expected output reports exact source vs target counts (`5` internships, `3` applications), ID match booleans (`true`), and foreign-key orphan count (`0`) without printing personal data.

---

## 5. Rollback & Recovery Procedure

- **If migration fails mid-run**: The script automatically executes `ROLLBACK` inside PostgreSQL, leaving both Neon and SQLite unchanged. Inspect the error message (for example, missing `DATABASE_URL` or non-empty target), resolve the condition, and re-run only when safe.
- **If you need to inspect Neon row counts without truncating**: Always run `npm run verify:migration`. Never automatically truncate populated tables.
- **If an emergency reset of a staging/test schema is ever required**: Back up any new applications first, manually review rows in Neon SQL Editor, and only clear staging tables after confirming backups exist. The original `backend/database/internships.db` file stays intact as a local snapshot.
