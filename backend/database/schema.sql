-- EdVyro Full Stack Development Task 3: REST API and Persistent Data
-- SQLite Database Schema for Internships

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

-- EdVyro Task 4: Applications Table with Foreign Key & Uniqueness Constraint
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(id)) > 0),
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL CHECK(length(trim(full_name)) > 0),
  email TEXT NOT NULL CHECK(length(trim(email)) > 0),
  cover_letter TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(internship_id, email)
);

CREATE INDEX IF NOT EXISTS idx_applications_internship_id ON applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_role_email ON applications(internship_id, lower(email));

