# ReviewFlow

[![CI](https://github.com/yusukesugahara/ReviewFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/yusukesugahara/ReviewFlow/actions/workflows/ci.yml)

ReviewFlow is a portfolio-grade full-stack workflow application for creating application forms, submitting requests, approving or returning them, managing spaces and users, exporting CSV data, and reviewing audit logs.

This repository is intended to show practical engineering quality, not only a working demo:

- Next.js App Router frontend
- NestJS backend with modular domain boundaries
- Tenant-aware authentication and authorization
- OpenAPI-based API type generation
- TypeORM entities and migrations
- Structured logging with pino
- Backend unit, integration, and E2E tests
- Frontend Playwright E2E foundation

## Features

- Email/password authentication with HttpOnly cookie session handling on the frontend
- System management console for spaces, invitations, export jobs, and audit logs
- Space management console for form setup, applications, and users
- Dynamic form template creation
- Approval flow setup with approval and return handling
- Applicant-facing application flow
- CSV export jobs
- Request/audit logging with request IDs

## Repository Structure

Current structure:

```text
.
├── apps/
│   ├── frontend/        # Next.js App Router application
│   └── backend/         # NestJS API server
├── docs/                # Domain, architecture, API, auth, workflow docs
├── docker-compose.yml   # Local full-stack development stack
├── AGENTS.md            # Coding-agent rules for this repository
├── package.json         # Root workspace scripts
└── README.md
```

There is currently no `packages/shared`, `packages/ui`, `infra`, or `turbo.json`.
If shared packages or infrastructure directories are added later, update this README, `AGENTS.md`, and the relevant docs in the same change.

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zod
- Playwright
- OpenAPI-generated API types

Backend:

- NestJS
- TypeScript
- TypeORM
- class-validator / class-transformer
- Passport JWT
- pino / nestjs-pino
- Swagger / OpenAPI
- Jest / Supertest

Database:

- MySQL is the target production database.
- SQLite via `better-sqlite3` is supported for local development and tests.

## Architecture Notes

- The backend is the source of truth for business rules, authorization, validation, and persistence.
- The frontend may hide unavailable UI actions, but backend authorization remains mandatory.
- Backend APIs use an internal `X-API-Key` for server-to-server access and JWT for user identity.
- Tenant-owned data must be scoped by the authenticated user's `tenantId`.
- Frontend API types are generated from the backend OpenAPI schema.
- There is no shared package yet; current type sharing is OpenAPI schema → generated frontend types.

See also:

- [Architecture](docs/05_architecture.md)
- [Domain model](docs/02_domain_model.md)
- [ER diagram](docs/03_er_diagram.md)
- [API spec](docs/04_api_spec.md)
- [Auth and multitenancy](docs/08_auth_and_multitenant.md)
- [Workflow and approval](docs/09_workflow_and_approval.md)
- [Coding rules](docs/11_coding_rules.md)
- [Agent rules](AGENTS.md)

## Prerequisites

- Node.js LTS
- npm
- Docker and Docker Compose, when using the containerized stack

The repository uses npm workspaces for root-level commands:

```json
{
  "workspaces": ["apps/frontend", "apps/backend"]
}
```

## Environment Setup

Backend:

```bash
cp apps/backend/.env.example apps/backend/.env.dev
```

Frontend:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

The default local values are aligned for:

- Backend API: `http://127.0.0.1:3000`
- Frontend: `http://127.0.0.1:3001`
- Shared local `INTERNAL_API_KEY`: `dev-internal-key-change-me`

Important environment variables:

| App | Variable | Purpose |
| --- | --- | --- |
| backend | `INTERNAL_API_KEY` | Required server-to-server API key. Must match frontend. |
| backend | `JWT_SECRET` | JWT signing secret. Use a long random value outside local dev. |
| backend | `DB_PATH` | SQLite DB path for local development. |
| backend | `DB_DRIVER` | `sqlite`, `mysql`, or `mariadb`. |
| backend | `DATABASE_URL` / `DB_*` | MySQL/MariaDB connection settings. |
| backend | `CORS_ORIGIN` | Browser origin allowed to call the backend directly. |
| backend | `FRONTEND_BASE_URL` | Base URL used in invitation/application emails. |
| frontend | `NEXT_PUBLIC_API_URL` | Browser-visible backend API origin. |
| frontend | `INTERNAL_API_KEY` | Server-only key used by Next.js server code. |
| frontend | `INTERNAL_API_ORIGIN` | Optional server-only backend origin, useful in Docker. |

Do not commit `.env`, `.env.dev`, `.env.local`, real API keys, real mail credentials, local DB files, `.next`, `dist`, or `node_modules`.

## Local Development

Install dependencies per app if needed:

```bash
cd apps/backend
npm install

cd ../frontend
npm install
```

Run the backend:

```bash
npm run dev:backend
```

Run the frontend:

```bash
npm run dev:frontend
```

Run the full Docker-based local stack:

```bash
npm run dev
```

Docker Compose starts:

- backend on `http://localhost:3000`
- frontend on `http://localhost:3001`
- SQLite volume for backend data by default
- optional MySQL service with `--profile mysql`

To include MySQL:

```bash
docker compose --profile mysql up --build
```

When using MySQL, configure the backend with `DB_DRIVER=mysql` and the matching `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` values.

## Root Commands

Run from repository root:

```bash
npm run dev            # Docker Compose full stack
npm run dev:frontend   # Next.js dev server on port 3001
npm run dev:backend    # NestJS dev server on port 3000
npm run lint           # Frontend and backend lint checks
npm run typecheck      # Frontend and backend TypeScript checks
npm run test           # Backend Jest tests
npm run build          # Backend and frontend production builds
npm run check          # lint + typecheck + test + build
```

Current limitation:

- Frontend E2E is intentionally separate because it requires a reachable backend test environment.
- Backend E2E is currently local-only. Some scenarios still need to be realigned with the current role/authorization contract before they are stable enough for CI.
- MySQL is not started in the default CI job. Current automated tests do not require it.

Frontend E2E:

```bash
cd apps/frontend
npm run test:e2e
```

Backend E2E:

```bash
cd apps/backend
npm run test:e2e
```

## API Type Generation

The backend OpenAPI schema is committed as `apps/backend/schema.json`.
Frontend generated types live in `apps/frontend/src/lib/api-schema.d.ts`.

After backend API contract changes:

```bash
npm run openapi:emit
npm run generate:api-types
npm run typecheck
```

## Verification Before PR

For repository hygiene and portfolio quality, run:

```bash
npm run check
```

This is the same local gate as the GitHub Actions CI job: frontend/backend lint, frontend/backend typecheck, backend unit tests, and frontend/backend builds.

Backend E2E is available as a local, focused command while those scenarios are being stabilized:

```bash
npm run test:e2e -w backend
```

For API contract changes:

```bash
npm run openapi:emit
npm run generate:api-types
npm run typecheck
```

For frontend user-flow changes:

```bash
cd apps/frontend
npm run test:e2e
```

If a command cannot be run because a service, browser, database, or credential is missing, document that in the PR or final task summary.

## Documentation

Documentation is part of the deliverable. Update docs when changing domain behavior, API contracts, authorization, DB schema, setup, or commands.

Key documents:

- `docs/00_overview.md`: Product overview
- `docs/01_business_requirements.md`: Business requirements
- `docs/02_domain_model.md`: Domain model
- `docs/03_er_diagram.md`: ER diagram
- `docs/04_api_spec.md`: API specification
- `docs/05_architecture.md`: Architecture
- `docs/06_backend_design.md`: Backend design
- `docs/07_frontend_design.md`: Frontend design
- `docs/08_auth_and_multitenant.md`: Authentication and multitenancy
- `docs/09_workflow_and_approval.md`: Workflow and approval
- `docs/10_correction_feature.md`: Return/correction feature
- `docs/11_coding_rules.md`: Coding rules
- `docs/12_tasks.md`: Task notes
- `docs/13_codex_prompt_examples.md`: Codex prompt examples

## Portfolio Review Notes

This repository is strongest when it clearly communicates:

- Why the domain is modeled this way
- How tenant isolation and authorization are enforced
- How API contracts stay type-safe across frontend and backend
- How tests protect critical workflows
- How a reviewer can run and verify the system quickly

Keep implementation, README, docs, and `AGENTS.md` aligned.
