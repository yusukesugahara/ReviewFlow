# ReviewFlow Coding Rules

Use this file when implementing or reviewing ReviewFlow code.

## Global Rules

- Use TypeScript strict style.
- Avoid `any`; use generated types, domain types, DTOs, or narrow `unknown`.
- Prefer explicit business names: `submitApplication`, `approveApplication`, `returnApplicationForCorrection`, `resubmitApplication`.
- Keep validation, authorization, workflow transition, persistence, response mapping, request logging, and audit logging separate.
- Do not add new packages unless they are clearly necessary.
- Keep changes scoped to the requested feature or bug.

## Frontend Rules

### Next.js App Router

- Use App Router conventions.
- Put routes under `apps/frontend/src/app`.
- Use `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and route-level `actions.ts` where appropriate.
- Use Server Components by default.
- Use Client Components only for:
  - forms
  - modals
  - tabs
  - dropdowns
  - local UI state
  - browser-only APIs
  - polling that cannot be done server-side

### Data Fetching

- Fetch data server-side in `page.tsx`, Server Components, server actions, or server-only utilities.
- Do not expose `INTERNAL_API_KEY`, JWTs, or HttpOnly cookie values to the browser.
- Use OpenAPI-generated types or typed API wrappers.
- Avoid ad hoc response shaping inside React components.
- Page-level data requirements should be explicit.

### Forms

- Use React Hook Form for form state.
- Use Zod for frontend schema validation.
- Keep dynamic form field rendering separated by field type.
- For returned applications, only correction target fields should be editable in the UI.
- Remember that UI editability is not security; backend must enforce the same rule.

### Components And Directories

- Put page-only components in a sibling `_components` directory.
- Put multi-page app components in `src/app/_components` or an existing shared location.
- Put generic UI primitives in `src/components/ui`.
- Put API clients, server utilities, constants, and shared helpers in `src/lib`.
- Avoid mixing data fetching, form mutation, and presentation in one large component.

### UI States

Every user-facing data view should consider:

- loading state
- error state
- empty state
- permission-denied state
- success feedback for mutations

For ReviewFlow-specific screens, expose workflow context clearly:

- current application status
- current approval step
- correction comments and target fields
- audit or history context where relevant
- CSV export job state where relevant

## Backend Rules

### NestJS Structure

- Controllers map requests and responses.
- DTOs define input/output contract and validation.
- Services coordinate use cases.
- Policies decide authorization and workflow permissions.
- Validators validate input/state rules.
- Repositories own database access.
- Entities describe persistence shape.
- Audit log services/interceptors record business events.

Do not put workflow logic directly in Controllers.

### Authorization And Scoping

- Always enforce authorization in backend code.
- Never rely only on frontend role checks.
- Never trust `tenantId` from client input.
- Include tenant scope in all business-data queries.
- Include `groupId`/space scope for space-level resources.
- Check current user, tenant role, space role, application owner, application status, and current approval step as needed.
- Prefer focused policy/access classes over repeated inline conditions.

### Workflow

- Keep state transition rules in a workflow or policy class.
- Reject invalid transitions explicitly.
- Tests should cover allowed and forbidden transitions.
- Approval, return, resubmit, and reject operations should be named as business actions, not generic updates.

### Persistence

- Use TypeORM repositories/entities/migrations according to the current project pattern.
- Use transactions when a use case updates multiple records that must stay consistent, such as:
  - application status + approval history
  - return for correction + correction fields + audit log
  - resubmission + correction resolution + status transition
  - export job creation + scoped export metadata
- Keep database-dialect-specific SQL out of business logic.
- Inspect current database config before writing migrations or raw queries.

### Audit And Logging

- Record important business actions in audit logs.
- Keep request/operational logs separate from business audit logs.
- Use Pino structured logging for operational logs.
- Do not log secrets, JWTs, applicant access tokens, passwords, or API keys.

## API Design

- Keep Swagger / OpenAPI decorators up to date when API contracts change.
- Regenerate frontend API types after backend contract changes.
- Use consistent status codes:
  - `400` for invalid input or invalid transition
  - `401` for unauthenticated access
  - `403` for authenticated but forbidden access
  - `404` when the resource is not visible in the caller's scope
  - `409` for conflicts where appropriate
- Avoid leaking cross-tenant existence through error messages.
- Keep response mapping separate from entities when exposing raw entities would reveal internal fields.

## Testing Rules

Prioritize tests for behavior with business risk:

- authorization policies
- tenant/group scoping
- application workflow transitions
- correction target field restrictions
- CSV export scoping
- audit log creation for important operations
- API contract behavior for forbidden and invalid operations

Frontend tests should cover:

- form validation
- actions/server utilities
- critical page states
- correction UI behavior
- generated API type assumptions where useful

Backend tests should cover:

- pure policy/workflow modules
- service orchestration
- repository queries where tenant scope is easy to regress
- controller/API behavior for auth and validation

End-to-end tests should stay focused on portfolio-critical flows:

- signup/login
- create form and approval flow
- submit application
- approve application
- return for correction
- resubmit
- reject
- export CSV or verify export job creation

## Documentation Rules

- Update README/docs when behavior, architecture, or setup changes.
- Explain portfolio value in concrete terms: workflow, authorization, tenant isolation, auditability, and typed API integration.
- Do not present ReviewFlow as a simple CRUD/admin template.
- Keep implementation rules in docs separate from reference/background information.
