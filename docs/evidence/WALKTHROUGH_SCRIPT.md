# InternBoard — Two-Minute Walkthrough Script

> **Status**: Walkthrough video recording pending by author. Use this exact 2-minute script to record your screen demonstration.

---

## Scene-by-Scene Script (Total: ~2:00)

1. **[0:00 – 0:40] Purple & White Portal Overview, Stats & Search/Filters (`/`)**
   - Open `http://localhost:5000/index.html` (or the live GitHub Pages URL).
   - Highlight the clean purple/indigo and white design system, hero quick-search bar, live mini-stats, and the 4 summary cards (**5 internships**, **9 openings**, **4 domains**, **3 remote**, **N/A paid**).
   - Type `"Figma"` in search, combine **Domain** + **Work Mode** filters, sort by openings, test empty state (`"No internships found."`), and click **Clear Filters**.
   - Scroll briefly through the About, FAQ, and Contact sections, and resize or open the mobile hamburger menu (`Escape` closes cleanly).

2. **[0:40 – 1:05] Internship Details & Accessible Modal**
   - Click **View Details** on `INT-101` (Frontend Intern), inspect role facts and required skills, press `Escape` to demonstrate keyboard closing and focus return.

3. **[1:05 – 1:35] Application Form, Client/Server Validation & Duplicate Protection**
   - Click **Apply Now** on `INT-102` (API Engineering Intern).
   - First submit an invalid email (`nijju123`) or empty Full Name to show immediate accessible inline validation (`aria-invalid`).
   - Enter valid candidate info and submit -> show `HTTP 201` confirmation receipt with server-generated `APP-...` ID.
   - Re-open `INT-102` and submit the same email again -> show server `HTTP 409 Conflict` duplicate protection without erasing entered text.

4. **[1:35 – 2:00] Health Check, Security & Test Evidence**
   - Open `http://localhost:5000/api/health` showing `service: "InternBoard API"`, `api: "running"`, `database: "connected"`.
   - Show terminal running `cd backend; npm test` (`46/46` passing) and `node --test tests/frontend.test.mjs` (`16/16` passing), highlighting Helmet headers, `express-rate-limit` (`429`), parameterized SQL queries, and PII-redacted structured logs.
