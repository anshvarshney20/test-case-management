# Free deploy guide (Render + Vercel + Supabase)

Repo: https://github.com/anshvarshney20/test-case-management

## 1. Render — backend API

1. Open [https://dashboard.render.com](https://dashboard.render.com)
2. **New → Blueprint** (or **Web Service**)
3. Connect GitHub repo `anshvarshney20/test-case-management`
4. If manual Web Service:
   - **Root Directory:** `backend`
   - **Build:** `npm install`
   - **Start:** `node src/server.js`
   - **Instance:** Free
5. Environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render sets this; keep as-is if auto) |
| `DATABASE_URL` | your Supabase URI |
| `DB_SSL` | `true` |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | `24h` |
| `FRONTEND_URL` | your Vercel URL (set after step 2), e.g. `https://….vercel.app` |
| `REDIS_URL` | optional Upstash URL |

6. Deploy → copy the service URL, e.g. `https://tcm-api.onrender.com`

## 2. Vercel — frontend

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import `anshvarshney20/test-case-management`
3. **Root Directory:** `frontend`
4. Framework: Vite
5. Environment variable:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | Render API origin, e.g. `https://tcm-api.onrender.com` (no trailing `/api`) |

6. Deploy → copy the frontend URL
7. Go back to Render and set `FRONTEND_URL` to that Vercel URL, then redeploy API (CORS)

## 3. Demo credentials

- Admin: `admin@demo.com` / `Admin@123`
- Test Lead: `lead@demo.com` / `Lead@123`
- Tester: `tester@demo.com` / `Tester@123`
- Read-Only: `readonly@demo.com` / `Read@123`

## Notes

- First Render request after idle may take 30–60s (free tier sleep)
- Supabase already has schema + seed data
