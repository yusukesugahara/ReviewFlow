---
name: reviewflow-portfolio
description: Use this skill when reviewing, improving, or implementing the ReviewFlow portfolio project. It applies to Next.js, NestJS, TypeScript, workflow design, authorization, tenant scoping, and portfolio documentation.
---

# ReviewFlow Portfolio Skill

Use this skill when working on ReviewFlow code, documentation, design review, workflow behavior, authorization, tenant/workspace scoping, or portfolio presentation.

ReviewFlow is not a generic CRUD app. Treat it as a portfolio project that demonstrates a real application and approval workflow:

- application form creation
- external applicant intake
- approval flow setup
- application review
- approval
- return for correction
- resubmission
- rejection
- CSV export
- audit log review
- tenant isolation
- workspace/space isolation
- role-based authorization
- state transition management

## When To Use

Use this skill for:

- modifying ReviewFlow frontend or backend code
- improving `README.md`, `docs/`, screenshots, or portfolio explanations
- reviewing Next.js / NestJS / TypeScript architecture
- changing authorization, tenant scoping, group/workspace scoping, or workflow transitions
- improving the product's value as a portfolio artifact

## First Checks

Before changing behavior:

- Read the relevant local docs under `docs/`, especially:
  - `docs/00_overview.md`
  - `docs/05_architecture.md`
  - `docs/06_backend_design.md`
  - `docs/07_frontend_design.md`
  - `docs/08_auth_and_multitenant.md`
  - `docs/09_workflow_and_approval.md`
  - `docs/10_correction_feature.md`
  - `docs/11_coding_rules.md`
- Prefer the actual repository implementation over assumptions in stale docs.
- If database details matter, inspect the current config and migrations first. The project uses TypeORM with a relational database; current repository docs/config may differ from older MySQL-oriented descriptions.

## Default Work Plan

When working on ReviewFlow:

1. Identify the affected domain: frontend UI, backend API, workflow, authorization, tenant/space scoping, docs, or portfolio presentation.
2. Read the relevant local docs and reference files before editing.
3. Locate the current implementation and follow existing patterns.
4. Confirm the security and workflow invariants:
   - backend authorization
   - `tenantId` scoping
   - `groupId`/space scoping
   - application status transition validity
   - current approval step assignment
   - audit log requirement
5. Put logic in the correct layer:
   - UI in frontend components
   - API coordination in server actions/utilities
   - request mapping in Controllers
   - business rules in Services, policies, validators, or workflow classes
   - persistence in repositories
6. Add or update tests for business-risk areas.
7. If backend API contracts change, update Swagger/OpenAPI and regenerate frontend API types.
8. Update README/docs when the change affects portfolio value, setup, architecture, or user-facing behavior.
9. Run the narrowest useful verification first, then broader checks if the change has wider impact.

## Portfolio Evaluation Criteria

When implementing or reviewing, check whether the change strengthens these points:

- ReviewFlow expresses a real business workflow, not just CRUD screens.
- The flow from application submission to approval, return, correction, resubmission, approval, and rejection is natural.
- Authorization is enforced in the backend, not only by hiding frontend buttons.
- `tenantId` and `groupId`/workspace scoping prevent cross-tenant and cross-workspace access.
- State transitions cannot skip required workflow rules.
- Audit logs make important operations traceable.
- Next.js and NestJS responsibilities are separated clearly.
- OpenAPI-generated types connect frontend and backend safely.
- The README/docs explain why the project is technically stronger than a simple admin tool.

## Frontend Rules

- Assume Next.js App Router.
- Fetch data primarily in Server Components, `page.tsx`, `actions.ts`, or server-side utilities.
- Use Client Components only for forms, modals, tabs, dropdowns, browser-only behavior, and local UI state.
- Use React Hook Form and Zod for forms and validation.
- Prefer OpenAPI-generated types for API data and request/response handling.
- Avoid `any`.
- Put page-only components in a sibling `_components` directory.
- Extract components used by multiple screens into shared components.
- Design loading, error, and empty states for each user-facing data view.
- Frontend visibility checks are UX only. Backend policies must enforce the real rule.

## Backend Rules

- Keep NestJS Controller / Service / Module / DTO / Entity responsibilities separate.
- Do not put complex business rules in Controllers.
- Put business logic in Services or focused domain classes such as policies, validators, workflows, and repositories.
- Always enforce authorization in the backend.
- Consider `tenantId`, `groupId`, `userId`, role, application status, and current approval step.
- Use TypeORM for persistence.
- Use transactions when an operation updates multiple tables that must remain consistent.
- Record important operations in audit logs.
- Use Pino structured logs for operational logging.
- Maintain API contracts with Swagger / OpenAPI.

## ReviewFlow Business Rules

- Applicants can view their own applications.
- Applicants can resubmit applications returned for correction.
- Approvers can view, approve, return, or reject applications assigned to their current step.
- Tenant admins can manage forms, flows, applications, spaces, users, and audit logs inside their own tenant.
- Users must not access data from another tenant or another workspace/space.
- Returned applications must preserve correction target fields and comments.
- Important operations must be written to audit logs.

## Definition Of Done

A ReviewFlow change is not complete until:

- Backend authorization is enforced, not only frontend UI visibility.
- Tenant and space/workspace boundaries are preserved.
- Invalid workflow transitions are rejected.
- Important business actions are audit logged.
- Frontend views handle loading, error, and empty states where relevant.
- OpenAPI-generated types are updated when API contracts change.
- Tests cover changed policy, workflow, validation, or API behavior where risk exists.
- Docs/README are updated when portfolio explanation or behavior changes.

## Reference Files

Read these only when needed:

- `references/skills.md` for the technology stack and what each library is used for.
- `references/architecture.md` for domain design, tenant/workspace separation, workflow, state transitions, and audit logs.
- `references/coding-rules.md` for concrete Next.js, NestJS, TypeScript, testing, directory, and API implementation rules.
