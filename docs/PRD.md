# Product Requirements Document (PRD)

## TestCase Hub — Full-Stack Test Case Management System

| Field | Detail |
|-------|--------|
| **Product name** | TestCase Hub |
| **Document type** | Product Requirements Document / Assignment PR Report |
| **Version** | 1.0.0 |
| **Date** | 18 November 2026 |
| **Status** | Delivered — live demo available |
| **Author** | Ansh Varshney |
| **Repository** | https://github.com/anshvarshney20/test-case-management |

---

## 1. Executive summary

TestCase Hub is a full-stack web application that lets QA teams create, organize, execute, and analyze software test cases with role-based access control. The product fulfills the Full Stack Test Case Management System assignment: React 18 frontend, Node.js/Express backend, PostgreSQL database, Redis-ready caching, analytics charts, Swagger documentation, and a publicly hosted demo.

### Live deliverables

| Item | URL |
|------|-----|
| **Demo application** | https://test-case-management-azure.vercel.app |
| **REST API** | https://test-case-management-ft76.onrender.com |
| **Swagger / OpenAPI** | https://test-case-management-ft76.onrender.com/api/docs |
| **Source code** | https://github.com/anshvarshney20/test-case-management |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Admin@123 |
| Test Lead | lead@demo.com | Lead@123 |
| Tester | tester@demo.com | Tester@123 |
| Read-Only | readonly@demo.com | Read@123 |

---

## 2. Problem statement

Software teams need a centralized system to:

- Maintain reusable test cases and suites across projects
- Record execution results with an audit trail
- Enforce who can author vs execute vs only view
- Visualize pass/fail trends, coverage, and defect density

Without such a system, test assets live in spreadsheets, permissions are unclear, and reporting is manual.

---

## 3. Goals and success criteria

### Goals

1. Deliver a working TCM application covering auth, RBAC, projects, cases, suites, execution, defects, and analytics.
2. Meet the specified tech stack (React 18+, Express, PostgreSQL, Redis caching, Chart.js/Recharts).
3. Provide documentation (README, API docs, schema, user guide) and a live demo with seeded data.

### Success criteria

- [x] All four roles can sign in and see role-appropriate UI/API behavior
- [x] Admin/test-lead can manage projects, cases, and suites
- [x] Tester can execute tests and create defects from failures
- [x] Read-only can view but not mutate or execute
- [x] Dashboard shows pie, line, and bar charts from live data
- [x] Public demo URL works end-to-end
- [x] Swagger docs available online

---

## 4. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Recharts, react-window |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (hosted on Supabase) |
| Caching | Redis client with in-memory fallback (Docker Redis locally) |
| Auth | JWT + bcrypt |
| Docs | Swagger UI / OpenAPI |
| Hosting | Vercel (frontend), Render (API), Supabase (DB) |

---

## 5. Users and roles (RBAC)

| Capability | Admin | Test Lead | Tester | Read-Only |
|------------|-------|-----------|--------|-----------|
| Manage users | Yes | No | No | No |
| Create/edit projects | Yes | Yes | No | No |
| CRUD test cases & suites | Yes | Yes | No | No |
| Execute tests / create defects | Yes | Yes | Yes | No |
| View cases, results, analytics | Yes | Yes | Yes | Yes |

Permissions are enforced in backend middleware (JWT role claims) and mirrored in the frontend (conditional rendering / disabled actions).

---

## 6. Functional requirements

### 6.1 Authentication

- User registration and login
- JWT-based API authentication
- Protected frontend routes
- Role field on users (default `tester`)

### 6.2 Project management

- Create and manage multiple projects (name, description, version, status)
- Assign team members to projects
- Restricted to admin and test-lead for create/modify

### 6.3 Test case management

- CRUD for admin and test-lead
- Attributes: title, description, priority, type, pre/post conditions, steps with expected results, tags
- Organize into suites; search/filter; bulk delete / priority update / suite assign
- Read-only users can view details only

### 6.4 Test execution

- Execute cases (admin, test-lead, tester)
- Results: Pass, Fail, Blocked, Skipped
- Comments; defect creation from failed runs
- Execution history / audit trail
- Assign cases to testers; suite-level execution

### 6.5 Dashboard analytics

- Summary: total, passed, failed, blocked, pending
- Coverage, pass rate, defect density
- Charts: pie (status), line (trends), bar (pass/fail by priority)
- Progress by tester
- Accessible to all roles including read-only

### 6.6 Test suite management

- Create/manage suites; add/remove cases
- Execute entire suite; suite-level reporting

### 6.7 Performance / platform features

- Route-based lazy loading (`React.lazy` + Suspense)
- Pagination for case lists
- Virtual scrolling for large lists
- Caching for analytics (15m), suites (30m), projects (1h)
- Rate limiting on auth, CRUD, execution, analytics endpoints

---

## 7. Non-functional requirements

| Area | Requirement | Implementation |
|------|-------------|----------------|
| Security | XSS / injection hardening, validation, JWT | Helmet, xss sanitize, express-validator, bcrypt |
| Performance | Caching, pagination, code splitting | Redis/memory cache, paginated APIs, lazy routes |
| Reliability | Hosted demo with managed Postgres | Render + Supabase pooler |
| Usability | Role-aware UI, dark mode | Auth/theme contexts, conditional controls |
| Documentation | API + setup + schema + role guide | Swagger, README, docs/* |

---

## 8. System architecture

```
Browser (Vercel React SPA)
        |
        | HTTPS + JWT
        v
Express API (Render)
   |            |
   v            v
Supabase      Cache
Postgres   (Redis or memory)
```

### Key modules

- **Frontend:** AuthContext, ThemeContext, ProjectContext; pages for Dashboard, Projects, Test Cases, Suites, Executions, Defects, Users
- **Backend:** Auth, Users, Projects, Test Cases, Suites, Executions, Analytics routes with RBAC middleware
- **Database:** users, projects, project_members, test_cases, test_steps, test_suites, test_suite_cases, test_executions, defects, attachments, audit_logs

---

## 9. API surface (selected)

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public |
| GET | `/api/testcases` | All roles |
| POST/PUT/DELETE | `/api/testcases` | admin, test-lead |
| POST | `/api/testexecutions` | admin, test-lead, tester |
| GET | `/api/analytics/dashboard` | All roles |
| GET | `/api/users` | admin |
| POST | `/api/projects` | admin, test-lead |

Full interactive documentation: Swagger at `/api/docs`.

---

## 10. Data model (summary)

- **users** — email, password_hash, full_name, role
- **projects** / **project_members**
- **test_cases** / **test_steps**
- **test_suites** / **test_suite_cases**
- **test_executions** — result, comments, executed_by, timestamps
- **defects** — linked to failed executions
- Indexes on frequently queried fields (project, priority, type, tags GIN, execution time)

---

## 11. Deployment topology

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Env `VITE_API_URL` → Render API |
| Backend | Render (free) | Sleeps after idle; cold start 30–60s |
| Database | Supabase Postgres | Must use **pooler** URI from Render (IPv4) |
| Cache | Memory fallback on Render | Optional Upstash Redis via `REDIS_URL` |
| Local Redis | Docker `tcm-redis` | Used in local development |

---

## 12. Documentation deliverables

| Document | Location |
|----------|----------|
| Setup & overview | `README.md` |
| Deploy guide | `docs/DEPLOY.md` |
| Database schema | `docs/DATABASE.md` |
| Role user guide | `docs/USER_GUIDE.md` |
| Supabase notes | `docs/SUPABASE.md` |
| This PRD | `docs/PRD.md` |
| OpenAPI | `/api/docs` |

---

## 13. Out of scope / optional backlog

- Email notifications for assignments
- CI/CD pipeline integration
- Test run scheduling
- Full test case versioning
- CSV/Excel import (export is included)
- Production Upstash Redis wiring (code ready; env optional)

---

## 14. Risks and known limitations

1. **Render free tier cold starts** — first request after idle may take 30–60 seconds.
2. **Redis on production** — caching works via memory fallback unless `REDIS_URL` is configured.
3. **Supabase networking** — direct DB host is IPv6; Render requires the pooler connection string.

---

## 15. Acceptance checklist (assignment)

| Requirement | Status |
|-------------|--------|
| React 18+ frontend | Done |
| Node/Express backend | Done |
| PostgreSQL | Done (Supabase) |
| Redis caching design | Done (Redis locally; memory fallback on Render) |
| Charts (3+ types) | Done (Recharts pie/line/bar) |
| JWT + RBAC (4 roles) | Done |
| Projects / cases / suites / executions | Done |
| Dashboard analytics | Done |
| Lazy loading, pagination, virtual scroll | Done |
| Rate limiting + security hardening | Done |
| Swagger docs | Done |
| README + env examples + schema docs | Done |
| Live demo + demo credentials + seed data | Done |
| Bonus: CSV export, dark mode | Done |

---

## 16. Conclusion

TestCase Hub meets the assignment’s functional and technical requirements and is available as a public demo with seeded projects and four role accounts. Source code, API documentation, and setup guides are published in the GitHub repository for review.

**Primary demo:** https://test-case-management-azure.vercel.app  
**API docs:** https://test-case-management-ft76.onrender.com/api/docs  
**Code:** https://github.com/anshvarshney20/test-case-management
