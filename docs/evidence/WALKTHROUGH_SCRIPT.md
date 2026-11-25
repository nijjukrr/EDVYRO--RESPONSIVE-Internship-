# InternBoard — Two-Minute Walkthrough Script

> **Status**: Walkthrough video recording pending by author. Use this exact 2-minute script to record your screen demonstration.

---

## Scene-by-Scene Script (Total: ~2:00)

1. **[0:00 – 0:20] Cinematic Landing Page (`/`)**
   - Open `http://localhost:8080/` (or live GitHub Pages URL).
   - Point out the full-bleed dark atmospheric video background, abstract S-bolt symbol, restrained Manrope typography (*"The Next Layer of Intelligence"*), minimal navigation links, and monochrome placeholder marks.
   - Resize briefly or toggle mobile drawer (`Escape` closes cleanly) and click **Get Started**.

2. **[0:20 – 0:45] Monochrome Portal & Search/Filters (`/internships/`)**
   - Show the transition into the white-and-black InternBoard application.
   - Highlight the live dashboard metrics (**5 internships**, **9 openings**, **4 domains**, **3 remote**, **N/A paid** because stipend isn't provided in the official dataset).
   - Type `"Figma"` in search, combine **Domain** + **Work Mode** filters, sort by openings, test empty state (`"No internships found."`), and click **Clear Filters**.

3. **[0:45 – 1:05] Internship Details & Accessible Modal**
   - Click **View Details** on `INT-101` (Frontend Intern), inspect role facts and required skills, press `Escape` to demonstrate keyboard closing and focus return.

4. **[1:05 – 1:35] Application Form, Client/Server Validation & Duplicate Protection**
   - Click **Apply Now** on `INT-102` (API Engineering Intern).
   - First submit invalid email (`nijju123`) or empty Full Name to show immediate accessible inline validation (`aria-invalid`).
   - Enter valid candidate info and submit -> show `HTTP 201` confirmation receipt with server-generated `APP-...` ID.
   - Re-open `INT-102` and submit the same email again -> show server `HTTP 409 Conflict` duplicate protection without erasing entered text.

5. **[1:35 – 2:00] Health Check, Security & Test Evidence**
   - Open `http://localhost:5000/api/health` showing `service: "InternBoard API"`, `api: "running"`, `database: "connected"`.
   - Show terminal running `cd backend; npm test` (`46/46` passing) and `node --test tests/frontend.test.mjs` (`16/16` passing), highlighting Helmet headers, `express-rate-limit` (`429`), parameterized SQL queries, and PII-redacted structured logs.
