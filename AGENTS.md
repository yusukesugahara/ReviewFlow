# AGENTS.md

This file defines how Codex and other coding agents should work in this repository.
The goal is to keep ReviewFlow maintainable as a portfolio-grade full-stack monorepo.

## Project Overview

ReviewFlow is a workflow application for creating application forms, submitting applications, approving or returning them, managing spaces and users, exporting CSV data, and auditing operations.

This repository should demonstrate:

- Clear frontend/backend responsibility boundaries
- Type-safe API contracts
- Tenant-aware authorization
- Maintainable domain logic
- Practical tests and build checks
- Documentation that explains design decisions, not only setup steps

Do not optimize only for "it works". Preserve design quality, type safety, and long-term maintainability.

## Monorepo Structure

Current structure:

```text
apps/
  frontend/   Next.js App Router application
  backend/    NestJS API server
docs/         Product, architecture, API, domain, and workflow documentation
docker-compose.yml
README.md
```

Expected future structure, if introduced:

```text
packages/
  shared/     Shared types, schemas, constants, and API-contract helpers
infra/        Deployment, DB, and infrastructure definitions
```

Do not add new top-level packages casually. Add them only when there is a clear ownership boundary and update this file, README, and docs accordingly.

## Directory Responsibilities

### `apps/frontend`

Owns the user interface and Next.js BFF/server-side integration.

Responsibilities:

- Page routing and UI composition
- Server Components and Server Actions
- HttpOnly cookie based session handling
- Calling the backend from server-only code with `INTERNAL_API_KEY`
- Browser-safe UI state, form state, and user interaction
- Generated API types from backend OpenAPI schema

Frontend must not:

- Reimplement backend authorization decisions
- Trust client-provided tenant IDs
- Expose `INTERNAL_API_KEY` or backend secrets to the browser
- Introduce ad hoc API response shapes when the backend contract already exists

### `apps/backend`

Owns business rules, persistence, authentication, authorization, validation, logging, and API contracts.

Responsibilities:

- NestJS modules grouped by domain capability
- DTO validation with `class-validator`
- Tenant-scoped data access
- Role and space authorization
- Error normalization through the global exception filter
- OpenAPI schema generation
- Database migrations and entity definitions
- Audit and request logging

Backend must not:

- Rely on frontend role checks for security
- Accept `tenantId` from client input as authority
- Put business rules in controllers
- Return inconsistent success/error envelopes

### `packages/shared` if added

There is currently no shared package. The current API contract is backend OpenAPI schema plus generated frontend types.

If `packages/shared` is added, it should contain only stable cross-app contracts:

- Branded IDs or shared primitive types
- Shared enum-like constants
- Zod schemas only when both apps genuinely need them
- API contract helpers that do not depend on Next.js or NestJS runtime APIs

Do not move backend entities, Nest DTO classes, React components, or persistence logic into shared.

### `infra` if added

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
- class-validator / class-transformer
- Passport JWT
- `@nestjs/throttler`
- `@nestjs/swagger`

Database:

- MySQL is the target production database.
- SQLite/better-sqlite3 may be used for local development and tests.
- Migrations must remain compatible with the intended production DB.

Logging:

- pino / nestjs-pino for structured application logs.
- Audit log persistence for tenant-scoped business/audit events.

## Coding Rules

General:

- Keep changes scoped to the user request.
- Prefer existing project patterns over introducing new architecture.
- Use TypeScript strictness; avoid `any`.
- Prefer explicit types at module boundaries.
- Avoid broad refactors unless they directly support the requested change.
- Do not commit generated or local cache files.
- Do not silently change public behavior without updating docs and tests.

Frontend:

- Keep server-only backend calls under `src/lib/server` or server-only route/action code.
- Keep client components focused on interaction and presentation.
- Prefer typed API wrappers over repeated `unknown` parsing.
- Do not read secrets from client components.
- Use existing UI components from `src/components/ui` when possible.
- Keep route layouts responsible for shell/navigation, not domain orchestration.

Backend:

- Controllers should be thin: validate input, call service, map response.
- Services own use cases and business rules.
- DTOs must validate all external input.
- Repositories/queries must always include tenant scope for tenant-owned data.
- Error paths should throw cataloged errors where practical.
- Keep OpenAPI decorators aligned with actual behavior.

## Prohibited Actions

Do not:

- Expose `INTERNAL_API_KEY`, JWT secrets, DB credentials, or mail credentials to the browser.
- Trust `tenantId` from request body, query, or URL when authenticated user context is available.
- Bypass backend authorization because the frontend hides a button.
- Add duplicate role names or UI-only role semantics without updating the role model.
- Add a new package, framework, state library, ORM, or test runner without a clear reason.
- Modify generated files manually when there is a generation command.
- Commit `node_modules`, `.next`, `dist`, coverage output, local DB files, or `.env` files.
- Delete tests to make a build pass.
- Suppress TypeScript or lint errors without explaining why in code or docs.

## API Design Policy

- Backend APIs are the source of truth.
- Success responses should use the existing success envelope pattern.
- Error responses should be normalized by the global exception filter.
- Use stable machine-readable `errorCode` values for expected business errors.
- Keep endpoint names resource-oriented and consistent.
- Use OpenAPI as the contract source for frontend generated types.
- Regenerate frontend API types after backend schema changes.
- Avoid leaking persistence implementation details unless they are part of the public contract.

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
- Redact secrets and credentials.
- Include request IDs where possible.
- Separate request logging from business audit logging when making logging changes.
- Audit logs should describe meaningful business events and include tenant context.
- Avoid logging raw passwords, JWTs, cookies, API keys, or full sensitive payloads.

## DB Design Policy

- All tenant-owned business tables should include `tenant_id`.
- Queries for tenant-owned data must constrain by authenticated tenant.
- Prefer explicit indexes for common tenant/status/date lookup patterns.
- Keep migrations deterministic and reviewable.
- Do not rely on `synchronize` for production schema changes.
- Preserve referential integrity with foreign keys where practical.
- When adding cross-table relationships, consider tenant consistency, not only row existence.

## Authentication and Authorization Policy

- Backend authorization is mandatory and authoritative.
- The frontend may improve UX by hiding inaccessible actions, but it is never the security boundary.
- JWT payload data must be verified against current database state when used for authorization-sensitive operations.
- Role checks should use central constants and documented semantics.
- Space-level authorization must be distinct from tenant/system-level authorization.

## Test Policy

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

When fixing a bug, add or update a regression test unless the change is purely cosmetic or documentation-only.

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

