# TestCase Hub — Full-Stack Test Case Management System

React + Node/Express + PostgreSQL + Redis application for creating, organizing, executing, and analyzing software test cases with role-based access control.

## Features

- JWT authentication with RBAC (`admin`, `test-lead`, `tester`, `read-only`)
- Project, test case, suite, execution, and defect management
- Dashboard analytics with Recharts (pie, line, bar)
- Redis caching (analytics 15m, suites 30m, projects 1h) with in-memory fallback
- Rate limiting, XSS sanitization, Helmet, validated inputs, secure uploads
- Lazy-loaded routes, pagination, virtual scrolling for large case lists
- Swagger/OpenAPI docs, CSV export, dark mode

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 18, Vite, Recharts, react-window |
| Backend  | Node.js, Express.js     |
| Database | PostgreSQL 16+          |
| Cache    | Redis 7+                |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (recommended for PostgreSQL + Redis)
- Or local PostgreSQL + Redis instances

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run setup    # migrate + seed demo data
npm run dev      # http://localhost:5000
```

API docs: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## Demo Credentials

| Role      | Email               | Password   |
|-----------|---------------------|------------|
| Admin     | admin@demo.com      | Admin@123  |
| Test Lead | lead@demo.com       | Lead@123   |
| Tester    | tester@demo.com     | Tester@123 |
| Read-Only | readonly@demo.com   | Read@123   |

Seed data includes an **E-Commerce Platform** project with suites, 12 test cases, execution history, and sample defects.

## Role permissions

| Capability              | admin | test-lead | tester | read-only |
|-------------------------|-------|-----------|--------|-----------|
| User management         | ✅    | ❌        | ❌     | ❌        |
| Create/edit projects    | ✅    | ✅        | ❌     | ❌        |
| CRUD test cases/suites  | ✅    | ✅        | ❌     | ❌        |
| Execute tests / defects | ✅    | ✅        | ✅     | ❌        |
| View cases & analytics  | ✅    | ✅        | ✅     | ✅        |

## API overview

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/login` | Public |
| GET | `/api/testcases` | All roles |
| POST/PUT/DELETE | `/api/testcases` | admin, test-lead |
| POST | `/api/testexecutions` | admin, test-lead, tester |
| GET | `/api/analytics/dashboard` | All roles |
| GET | `/api/users` | admin |
| POST | `/api/projects` | admin, test-lead |

## Caching & rate limits

- Analytics dashboard: **15 minutes**
- Suite lists: **30 minutes**
- Project metadata: **1 hour**
- Cache invalidated on writes
- Auth: 50 req / 15 min (demo-friendly; tighten to 5 in production)
- Test case CRUD: 100 / hour
- Executions: 200 / hour
- Analytics: 50 / hour

Check cache effectiveness: `GET /api/analytics/cache-metrics` (authenticated). The dashboard UI shows **cache hit/miss** and backend type (`redis` or `memory`).

## Project structure

```
├── backend/          Express API, migrations, seed, Swagger
├── frontend/         React SPA
├── docker-compose.yml
└── README.md
```

## Database schema

See `backend/src/db/schema.sql` and [docs/DATABASE.md](docs/DATABASE.md).

## User guide

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Environment

Backend `.env` keys are documented in `backend/.env.example`.

## Bonus included

- CSV export of test cases
- Dark mode theme toggle
- Defect creation from failed runs
- Cache metrics on dashboard
