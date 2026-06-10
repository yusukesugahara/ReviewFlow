# ReviewFlow Technology Stack

This file explains what each major technology is used for in ReviewFlow. Use it when changing dependencies, README/docs, architecture explanations, or implementation patterns.

## Frontend

| Technology | Used For | ReviewFlow Context |
| --- | --- | --- |
| Next.js | Web application framework and App Router routing | Tenant admin pages, space pages, application forms, public applicant flows, server-side API calls |
| React | UI component model | Dynamic forms, application detail views, approval action panels, dashboards |
| TypeScript | Type safety | Shared domain naming, OpenAPI response handling, form values, workflow status handling |
| Tailwind CSS | Utility-first styling | Layout, tables, forms, status badges, responsive admin screens |
| shadcn/ui-compatible components | Accessible UI primitives and consistent components | Buttons, dialogs, tables, inputs, tabs, dropdowns, alerts, cards where appropriate |
| React Hook Form | Form state management | Dynamic application forms, correction forms, login/signup, admin forms |
| Zod | Frontend schema validation | Form validation before submit, typed form schemas, user-facing validation messages |
| OpenAPI TypeScript client | Type-safe API integration | Frontend calls to NestJS APIs using generated request/response types |
| Jest / Testing Library | Frontend unit and component tests | Actions, utilities, form behavior, page-level rendering behavior |
| Playwright | End-to-end smoke tests | Critical browser flows such as login, application submit, correction, and approval |

## Backend

| Technology | Used For | ReviewFlow Context |
| --- | --- | --- |
| NestJS | Backend application framework | Controllers, modules, guards, services, DTOs, Swagger integration |
| TypeScript | Backend type safety | DTOs, entities, policies, workflow logic, service contracts |
| TypeORM | Database access and migrations | Entities, repositories, transactional updates, tenant-scoped queries |
| Relational database | Persistent business data | Tenants, users, groups/spaces, form definitions, applications, approval flows, audit logs, export jobs |
| JWT / Passport | Authentication | Login sessions, authenticated tenant users, backend route guards |
| Applicant access token | External applicant access | Public application and correction flows without tenant account login |
| Swagger / OpenAPI | API contract | Backend API documentation and frontend type generation |
| Pino / nestjs-pino | Structured logging | Request logs, operational logs, troubleshooting production-like behavior |
| Jest / Vitest | Backend tests | Policies, validators, services, workflow transitions, controllers, integration tests |
| Nodemailer | Email integration | Invitation email, public application access email, correction notifications |

## Database Note

ReviewFlow should be described as using TypeORM with a relational database unless the current implementation has been verified.

- If the repository config uses PostgreSQL, keep PostgreSQL-specific SQL and migrations compatible with that setup.
- If a branch or requirement uses MySQL, verify migrations, column types, indexes, and transaction behavior before editing database-specific code.
- Do not introduce database-dialect-specific behavior in business logic.

## Cross-Cutting Libraries And Patterns

| Area | Preferred Approach | Why It Matters |
| --- | --- | --- |
| Validation | DTO validation on backend, Zod validation on frontend | Bad input should be rejected before it corrupts workflow state |
| Authorization | Backend guards, services, and policies | Button visibility cannot be the security boundary |
| Workflow | Dedicated policy/workflow classes | Application status changes must be explicit and testable |
| API typing | OpenAPI-generated client types | Reduces drift between Next.js and NestJS |
| Auditability | Audit log service/interceptor or explicit service calls | ReviewFlow must prove who did what and when |
| CSV export | Export job model and scoped queries | Export must respect tenant and workspace boundaries |

## Portfolio Interpretation

When explaining ReviewFlow to a recruiter or reviewer, emphasize that the stack is used to solve product problems:

- Next.js Server Components protect secrets and keep API calls server-side.
- NestJS organizes business rules, authorization, workflow transitions, and audit logging.
- TypeORM and a relational schema model real tenant-scoped workflow data.
- OpenAPI connects frontend and backend with generated types.
- Tests should focus on policies, validation, workflow transitions, and critical UI flows.
