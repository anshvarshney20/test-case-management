# Deploying with Supabase

## Important

**Supabase does not host Express/Node servers.**  
Use Supabase for **PostgreSQL** (and optionally Storage later). Host the Express API on Render, Railway, Fly.io, or similar.

| Piece | Where it runs |
|-------|----------------|
| Database | **Supabase Postgres** |
| Express API | Render / Railway / Fly / your VPS |
| React frontend | Vercel / Netlify / Render |
| Redis | Upstash / Redis Cloud (or memory fallback) |

## 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → pick region → set a strong DB password (save it)
3. Wait until the project is healthy

## 2. Get the connection string

1. **Project Settings → Database**
2. Copy **Connection string → URI**
3. Prefer:
   - **Session mode** or **Direct** (`:5432`) for a long-running Express process
   - **Transaction pooler** (`:6543`) if you use serverless

Replace `[YOUR-PASSWORD]` with the DB password.

Example:

```env
DATABASE_URL=postgresql://postgres.xxxxxxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DB_SSL=true
```

## 3. Point the backend at Supabase

In `backend/.env`:

```env
DATABASE_URL=postgresql://postgres....@....supabase.com:5432/postgres
DB_SSL=true
```

You can leave `DB_HOST` / `DB_USER` unused when `DATABASE_URL` is set.

## 4. Migrate + seed

```bash
cd backend
npm run setup
```

This runs `schema.sql` and loads demo users/cases into Supabase.

## 5. Run API locally against Supabase

```bash
cd backend
npm run dev
```

Frontend stays `npm run dev` in `frontend/`.

## 6. Deploy the Express API (not on Supabase)

Example (Render):

- Root: `backend`
- Start: `node src/server.js`
- Env: `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `FRONTEND_URL`

After deploy, set `FRONTEND_URL` to your hosted frontend origin for CORS.

## Optional: Supabase Storage for attachments

Today uploads go to local `uploads/`. For production, map Multer to Supabase Storage buckets — can be added later without changing RBAC/API shape.
