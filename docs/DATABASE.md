# Database Schema

PostgreSQL schema defined in `backend/src/db/schema.sql`.

## ER overview

```
users ──┬── projects (created_by)
        ├── project_members
        ├── test_cases (created_by, assigned_to)
        ├── test_suites (created_by)
        ├── test_executions (executed_by)
        ├── defects (reported_by)
        └── audit_logs

projects ──┬── test_cases ──┬── test_steps
           ├── test_suites ── test_suite_cases ── test_cases
           ├── test_executions ── attachments
           └── defects
```

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts with `role` (`admin`, `test-lead`, `tester`, `read-only`) |
| `projects` | Test projects (name, description, version, status) |
| `project_members` | User ↔ project assignment |
| `test_cases` | Cases with priority, type, tags[], assignment |
| `test_steps` | Ordered steps with expected results |
| `test_suites` | Named groups of cases |
| `test_suite_cases` | Many-to-many suite ↔ case |
| `test_executions` | Run results + audit fields |
| `defects` | Bugs linked to failed runs |
| `attachments` | Secure upload metadata |
| `audit_logs` | Action trail |

## Indexes

Frequently queried columns are indexed: emails, roles, project FKs, priorities/types, GIN on tags, execution timestamps/results.
