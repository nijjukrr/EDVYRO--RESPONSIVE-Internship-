# InternBoard Stage 2 — Production Deployment Guide

Architecture:
- **Frontend**: GitHub Pages (`https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/`)
- **Backend**: Render Free Web Service (`Node.js` + `Express` in `backend/`)
- **Production Database**: Neon PostgreSQL Free Tier (`pg` connection pool via `DATABASE_URL`)
- **Local Development / CI Database**: SQLite (`better-sqlite3`, fallback disabled in `NODE_ENV=production`)

---

## 1. Environment Variables

Configure these in the **Render Dashboard → Environment** (and use [`backend/.env.example`](backend/.env.example) as a local template; never commit `.env` or secrets):

| Variable | Required in Production | Example / Value | Purpose |
| --- | :---: | --- | --- |
| `NODE_ENV` | Yes | `production` | Enables strict PostgreSQL requirement (refuses SQLite fallback) and production CORS rules |
| `DATABASE_URL` | Yes | Neon pooled connection string (`?sslmode=require`) | Connects `pg` Pool to Neon PostgreSQL |
| `CORS_ORIGINS` | Recommended | `https://nijjukrr.github.io` | Comma-separated additional allowed browser origins |
| `PG_POOL_MAX` | No | `5` | Maximum pooled PostgreSQL connections |
| `RATE_LIMIT_MAX` | No | `10` | Max `POST /api/applications` submissions per window per IP |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate-limit window in ms (15 minutes) |

---

## 2. Neon PostgreSQL Setup

1. Create or open your Neon project on the Free Tier and copy the **Pooled connection string** (`-pooler` hostname).
2. Migrate existing local SQLite data cleanly by following [`DATABASE-MIGRATION.md`](DATABASE-MIGRATION.md):
   ```bash
   cd backend
   npm run migrate:postgres
   npm run verify:migration
   ```
3. Verify connectivity locally against Neon:
   ```bash
   cd backend
   npm run init-db
   ```
   *(Safe to run repeatedly: uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT (id) DO NOTHING`.)*

---

## 3. Render Free Web Service Setup (`render.yaml`)

This repository includes [`render.yaml`](render.yaml) configured for a Render Blueprint / Web Service:
- **Service Name**: `internboard-api`
- **Runtime**: `node` (`>=18.0.0`)
- **Plan**: `free`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### Manual Dashboard Steps
1. Open [Render Dashboard](https://dashboard.render.com/) → **New +** → **Blueprint** (or **Web Service**) and connect `nijjukrr/EDVYRO--RESPONSIVE-Internship-`.
2. If creating manually, set Root Directory to `backend`, Build Command to `npm install`, Start Command to `npm start`, and Health Check Path to `/api/health`.
3. Add environment variable `DATABASE_URL` manually with your Neon **pooled** connection string.
4. Set `NODE_ENV=production` and `CORS_ORIGINS=https://nijjukrr.github.io`.
5. Deploy and verify `https://<your-render-service>.onrender.com/api/health` returns:
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

---

## 4. Connecting GitHub Pages Frontend to Render

Once your Render backend URL is live (for example, `https://internboard-api.onrender.com`), connect the frontend without exposing any database credentials:

1. Open [`index.html`](index.html) and set the meta tag (or `DEFAULT_PRODUCTION_API_URL` in [`js/config.js`](js/config.js)):
   ```html
   <meta name="internboard-api-url" content="https://<your-render-service>.onrender.com/api">
   ```
2. Commit and push to `main`. GitHub Pages deploys automatically from `/` (root).
3. Test end-to-end on `https://nijjukrr.github.io/EDVYRO--RESPONSIVE-Internship-/`:
   - Confirm listings load from Render (`Source: API` / PostgreSQL).
   - Submit a test application with `fullName`, `email`, optional `portfolioUrl`, and `coverLetter`.
   - Confirm HTTP `201` receipt and persistence across Render restarts/redeployments.

---

## 5. Security & Troubleshooting

- **Missing `DATABASE_URL` in production**: The server refuses to start and exits cleanly instead of silently writing to ephemeral SQLite disk on Render.
- **CORS errors on GitHub Pages**: Verify `CORS_ORIGINS` on Render includes `https://nijjukrr.github.io` without a trailing slash, and remember `app.js` never uses wildcard `*` CORS.
- **Render Free Tier Cold Starts**: Free Web Services spin down after inactivity. If the initial fetch or submit times out during spin-up, wait 15–30 seconds and click **Retry**.
- **SSL with Neon**: `buildPgPoolConfig()` preserves connection-string `sslmode` settings and applies strict TLS (`ssl: { rejectUnauthorized: true }`) for non-local PostgreSQL hosts when `sslmode` is omitted.
