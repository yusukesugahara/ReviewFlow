# AGENTS.md

This file defines how Codex and other coding agents should work in this repository.
The goal is to keep ReviewFlow maintainable as a portfolio-grade full-stack monorepo.

## Core Principles

ReviewFlow should not be optimized only for "it works".
Every change should preserve:

- Clear frontend/backend responsibility boundaries
- Type-safe API contracts
- Tenant-aware authorization
- Maintainable domain logic
- Practical tests and build checks
- Documentation that explains design decisions, not only setup steps

When in doubt, prefer the existing project pattern over introducing a new abstraction, package, or architecture.

## Agent Operating Rules

Follow these rules for every task:

1. Keep the change scoped to the user's request.
2. Preserve security boundaries, especially tenant and authorization checks.
3. Do not change public behavior silently.
4. Update tests and documentation when behavior, API contracts, roles, setup, or workflows change.
5. Do not delete tests, suppress errors, or weaken validation just to make a build pass.
6. Report what you changed, which commands you ran, and which commands could not be run.

## Project Overview

ReviewFlow is a workflow application for:

- Creating application forms
- Submitting applications
- Approving or returning applications
- Managing spaces and users
- Exporting CSV data
- Auditing business operations

The repository should demonstrate practical full-stack engineering quality: clear domain boundaries, reliable authorization, API contract discipline, and maintainable implementation choices.

## Repository Structure

Current structure:

```text
apps/
  frontend/   Next.js App Router application
  backend/    NestJS API server
docs/         Product, architecture, API, domain, and workflow documentation
docker-compose.yml
README.md
```

Expected future structure, only if justified:

```text
packages/
  shared/     Shared types, schemas, constants, and API-contract helpers
infra/        Deployment, DB, and infrastructure definitions
```

Do not add new top-level packages casually. Add them only when there is a clear ownership boundary, and update this file, README, and related docs in the same change.

## Source of Truth

Use these ownership rules to avoid duplicated or conflicting logic:

| Area | Source of truth |
|---|---|
| Business rules | Backend services/domain logic |
| Authorization | Backend authorization policies/guards |
| API contract | Backend OpenAPI schema |
| Frontend API types | Generated from backend OpenAPI |
| User experience visibility | Frontend UI state and route behavior |
| Product/domain explanation | `docs/` |
| Setup and portfolio overview | `README.md` |

The frontend may hide inaccessible actions for UX, but the backend must remain the security boundary.

## Directory Responsibilities

### `apps/frontend`

Owns the user interface and Next.js BFF/server-side integration.

Responsibilities:

- Page routing and UI composition
- Server Components and Server Actions
- HttpOnly cookie-based session handling
- Calling the backend from server-only code with `INTERNAL_API_KEY`
- Browser-safe UI state, form state, and user interaction
- Generated API types from the backend OpenAPI schema

Frontend must not:

- Reimplement backend authorization decisions
- Trust client-provided tenant IDs as authority
- Expose `INTERNAL_API_KEY` or backend secrets to the browser
- Introduce ad hoc API response shapes when the backend contract already exists
- Put domain orchestration into route layouts

Frontend conventions:

- Keep server-only backend calls under `src/lib/server` or server-only route/action code.
- Keep client components focused on interaction and presentation.
- Prefer typed API wrappers over repeated `unknown` parsing.
- Use existing UI components from `src/components/ui` when possible.

### `apps/backend`

Owns business rules, persistence, authentication, authorization, validation, logging, and API contracts.

Responsibilities:

- NestJS modules grouped by domain capability
- Thin controllers that validate input, call services, and map responses
- Service-layer use cases and business rules
- DTO validation with `class-validator` / `class-transformer`
- Tenant-scoped data access
- Role and space authorization
- Error normalization through the global exception filter
- OpenAPI schema generation
- Database migrations and entity definitions
- Audit and request logging

Backend must not:

- Rely on frontend role checks for security
- Accept `tenantId` from client input as authority when authenticated user context is available
- Put business rules in controllers
- Return inconsistent success/error envelopes
- Leak persistence details unless they are part of the public API contract

### `packages/shared`, if added

There is currently no shared package. The current API contract is the backend OpenAPI schema plus generated frontend types.

If `packages/shared` is added, it should contain only stable cross-app contracts:

- Branded IDs or shared primitive types
- Shared enum-like constants
- Zod schemas only when both apps genuinely need them
- API contract helpers that do not depend on Next.js or NestJS runtime APIs

Do not move backend entities, Nest DTO classes, React components, or persistence logic into `packages/shared`.

### `infra`, if added

Infrastructure code should own deployment and environment concerns only:

- Docker and container definitions
- DB initialization or migration runner wiring
- CI/CD deployment definitions
- Cloud or local environment templates

Application business logic does not belong in `infra`.

### `docs`

Documentation is part of the product. Keep docs synchronized with implementation.

Update docs when changing:

- Domain model or workflow behavior
- API endpoints, response shapes, or error codes
- Auth, roles, tenant, or space authorization behavior
- DB schema or migration strategy
- Setup, test, build, or deployment flow

## Technology Stack

Package management:

- Use npm workspaces from the repository root.
- Keep the root `package-lock.json` as the only committed lockfile.
- Do not create or commit app-local lockfiles such as `apps/frontend/package-lock.json` or `apps/backend/package-lock.json`.
- Do not introduce `yarn.lock` or `pnpm-lock.yaml` unless the package manager policy is intentionally changed in README, CI, and this file in the same update.
- Run dependency installs from the repository root with npm.

Frontend:

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- Zod for frontend form/environment validation where appropriate
- Playwright for browser-level tests

Backend:

- NestJS
- TypeScript strict mode
- TypeORM
- `class-validator` / `class-transformer`
- Passport JWT
- `@nestjs/throttler`
- `@nestjs/swagger`

Database:

- MySQL is the target production database.
- SQLite/better-sqlite3 may be used for local development and tests.
- Migrations must remain compatible with the intended production database.
- Do not rely on TypeORM `synchronize` for production schema changes.

Logging:

- Use pino / nestjs-pino for structured application logs.
- Persist audit logs for tenant-scoped business events.
- Keep request logging separate from business audit logging.

## API Design Policy

- Backend APIs are the source of truth.
- Success responses should use the existing success envelope pattern.
- Error responses should be normalized by the global exception filter.
- Use stable machine-readable `errorCode` values for expected business errors.
- Keep endpoint names resource-oriented and consistent.
- Use OpenAPI as the contract source for frontend generated types.
- Regenerate frontend API types after backend schema changes.
- Keep OpenAPI decorators aligned with actual runtime behavior.

When changing an API:

1. Update DTOs and validation.
2. Update service behavior and tests.
3. Update OpenAPI decorators/schema.
4. Emit the OpenAPI schema.
5. Regenerate frontend API types.
6. Update docs if the behavior or contract changed.

## Authentication and Authorization Policy

- Backend authorization is mandatory and authoritative.
- Frontend checks are UX-only and must not be treated as security controls.
- JWT payload data must be verified against current database state when used for authorization-sensitive operations.
- Role checks should use central constants and documented semantics.
- Space-level authorization must be distinct from tenant-level authorization.
- Tenant-owned queries must always be scoped by the authenticated tenant.

Do not trust `tenantId` from request body, query, or URL when authenticated user context is available.

## Database Design Policy

- All tenant-owned business tables should include `tenant_id`.
- Queries for tenant-owned data must constrain by authenticated tenant.
- Prefer explicit indexes for common tenant/status/date lookup patterns.
- Keep migrations deterministic and reviewable.
- Preserve referential integrity with foreign keys where practical.
- When adding cross-table relationships, consider tenant consistency, not only row existence.

## Error Handling Policy

Backend:

- Expected business failures should use the client error catalog.
- Unexpected failures should be logged and normalized as server errors.
- Validation failures should be produced by DTO validation and the global validation pipe.
- Do not return raw stack traces or internal exception messages to clients.

Frontend:

- User-facing errors should be actionable and localized consistently.
- Server-side session probing may fail closed to unauthenticated where appropriate.
- Do not swallow errors that should block a workflow.
- Preserve backend `errorCode` where it is useful for UI branching or debugging.

## Logging Policy

- Use structured logs.
- Include request IDs where possible.
- Redact secrets and credentials.
- Avoid logging raw passwords, JWTs, cookies, API keys, or full sensitive payloads.
- Audit logs should describe meaningful business events and include tenant context.

## Test Policy

When fixing a bug, add or update a regression test unless the change is purely cosmetic or documentation-only.

Backend tests should cover:

- Service-level business rules
- Tenant isolation
- Role/space authorization
- Validation and error codes
- E2E API flows for critical workflows

Frontend tests should cover:

- Authentication cookie behavior
- Critical user journeys with Playwright
- Important form behavior and route flows

## Documentation Policy

Update README/docs in the same change when behavior, setup, commands, roles, DB schema, or API contracts change.

README should remain portfolio-facing:

- What the app does
- How to run it
- How to test it
- Architecture overview
- Key design decisions
- Screenshots or demo notes when available

Docs should remain engineering-facing:

- Domain model
- API contract
- Auth and authorization
- DB/ER design
- Workflow details
- Coding rules and operational notes

## Prohibited Actions

Do not:

- Expose `INTERNAL_API_KEY`, JWT secrets, DB credentials, or mail credentials to the browser.
- Trust client-provided tenant IDs as authority.
- Bypass backend authorization because the frontend hides a button.
- Add duplicate role names or UI-only role semantics without updating the role model and docs.
- Add a new package, framework, state library, ORM, or test runner without a clear reason.
- Modify generated files manually when there is a generation command.
- Commit `node_modules`, `.next`, `dist`, coverage output, local DB files, or `.env` files.
- Delete tests to make a build pass.
- Suppress TypeScript, lint, validation, or authorization errors without explaining why in code or docs.

If `apps/backend/dist` becomes container-owned and backend build fails with `EACCES`, restore ownership with:

```bash
docker compose exec -u root backend chown -R "$(id -u):$(id -g)" /workspace/apps/backend/dist
```

`dist` is generated output and should not be committed.

## Change-Specific Checklist

Use the relevant checklist for the type of change being made.

### Frontend UI or route change

- Uses existing UI/component patterns where possible
- Keeps secrets and backend-only calls out of client components
- Preserves typed API usage
- Handles loading, empty, and error states where relevant
- Adds or updates Playwright coverage for critical user flows

### Backend behavior change

- Keeps controllers thin
- Places business rules in services or domain policies
- Validates external input with DTOs
- Preserves tenant scoping
- Checks role and space authorization centrally
- Adds or updates service/E2E tests

### API contract change

- Updates DTOs, OpenAPI decorators, and response examples as needed
- Keeps success/error envelopes consistent
- Emits OpenAPI schema
- Regenerates frontend API types
- Updates docs if the contract changed

### DB schema change

- Adds deterministic migrations
- Preserves production DB compatibility
- Adds indexes for common lookup patterns where appropriate
- Verifies tenant consistency for relationships
- Updates ER/domain docs when needed

### Auth or authorization change

- Treats backend as authoritative
- Verifies JWT-derived data against current database state when needed
- Keeps tenant-level and space-level authorization separate
- Adds regression tests for allowed and denied paths
- Updates docs for role semantics

## Required Commands Before PR / Completion

Run the relevant checks for the files changed. If a command is unavailable, document that clearly in the final response.

Frontend:

```bash
cd apps/frontend
npm run typecheck
npm run build
```

Frontend E2E, when auth/session/UI flow changes:

```bash
cd apps/frontend
npm run test:e2e
```

Backend:

```bash
cd apps/backend
npm run lint:check
npm run test
npm run test:e2e
npm run build
```

Backend OpenAPI changes:

```bash
cd apps/backend
npm run openapi:emit

cd ../frontend
npm run generate:api-types
npm run typecheck
```

Root-level note:

- There is currently no complete root `check` script.
- Until one exists, run frontend and backend checks from each app directory.
- If a future root workspace script is added, update this section.

## PR Completion Checklist

Before considering work complete:

- Code compiles.
- Typecheck passes for changed app(s).
- Relevant tests pass.
- Backend API changes have updated OpenAPI schema and frontend generated types.
- README/docs are updated when behavior or setup changes.
- No secrets, local caches, generated build output, or dependency folders are added.
- Error handling uses existing patterns.
- Logs do not expose sensitive data.
- Tenant and role authorization paths are verified.
- Final response reports commands run and any commands that could not be run.
