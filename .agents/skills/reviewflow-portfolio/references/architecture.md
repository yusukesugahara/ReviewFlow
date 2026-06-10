# ReviewFlow Architecture Reference

Use this file when reviewing architecture, changing workflow behavior, improving docs, or explaining ReviewFlow as a portfolio project.

## Product Intent

ReviewFlow is a multi-tenant application and approval workflow SaaS. It is designed to show more than CRUD:

- organizations manage their own spaces/workspaces
- tenant admins invite and manage users
- spaces define application forms and approval flows
- applicants submit forms
- approvers review assigned steps
- approvers can approve, return for correction, or reject
- applicants can correct returned fields and resubmit
- admins can export CSV data and review audit logs

The strongest portfolio signal is that the system models a real business process with authorization, workflow state, tenant isolation, and traceability.

## Main Domains

| Domain | Responsibility |
| --- | --- |
| Tenant | Organization-level isolation boundary |
| User | Authenticated tenant member with tenant-level role |
| Group / Space / Workspace | Work area inside a tenant; backend may use `groupId` while UI may say space/workspace |
| Group member | Space membership and space-level role |
| Form definition | Dynamic application form structure |
| Form field | Field metadata used to render and validate application values |
| Approval flow | Ordered approval route for a space |
| Approval step | Current or future approver assignment |
| Application | Submitted or draft business request |
| Correction request | Return-for-correction target fields and comments |
| Audit log | Business event history |
| Export job | CSV export request and status |

## Tenant And Workspace Separation

ReviewFlow uses two important boundaries:

- `tenantId`: organization boundary
- `groupId` / space / workspace ID: work area boundary inside a tenant

Rules:

- Never trust `tenantId` from URL or request body.
- Derive tenant scope from authenticated context or applicant access token resolution.
- Every list, detail, update, delete, export, and audit query must include tenant scope.
- For space-level resources, also enforce `groupId` scope.
- Verify that the target group/space belongs to the current tenant before using it.
- Tenant admins may operate across spaces only inside their own tenant.
- Space roles must be checked from membership data, not guessed from tenant role alone.

Frontend may hide links and buttons, but backend authorization decides the final result.

## Authorization Model

Common authorization checks:

- tenant admin: manages tenant-level users, spaces, audit logs, and tenant-scoped business data
- space admin: manages forms, approval flows, submissions, CSV exports, and members for assigned space
- space user: creates applications, views own applications, reviews applications assigned to them
- applicant: can view and edit only own draft/returned application
- approver: can review only the current step assigned to them

Prefer named policies and access services:

- `ApplicationAccessPolicy` for application view/review decisions
- `ApplicationTransitionPolicy` for valid state transitions
- `ApplicationFormValueValidator` for form value validation
- `SpaceAccessService` or equivalent for group/space membership and role checks

Avoid repeated inline checks such as role comparisons scattered across controllers, services, and UI components.

## Approval Flow

MVP approval flow is serial:

1. A space has one or more approval flows.
2. A flow has ordered approval steps.
3. An application selects or resolves an approval flow.
4. Submission moves the application into review.
5. The current step assignee can approve, return, or reject.
6. Intermediate approval moves to the next step.
7. Final approval completes the application.

Approver decisions must consider:

- tenant scope
- group/space scope
- current application status
- current approval step
- current user assignment
- tenant admin override rules, if implemented

## State Transitions

Expected statuses:

| Status | Meaning |
| --- | --- |
| `draft` | Applicant or tenant user is preparing the application |
| `published` | Public application form is available for intake |
| `in_review` | Application is under approval review |
| `returned` | Application requires correction |
| `approved` | Final approval completed |
| `rejected` | Application was rejected and should not be resubmitted |

Expected transitions:

- `draft` -> `in_review` on submit
- `published` -> `in_review` on public submit
- `in_review` -> `in_review` on intermediate approval
- `in_review` -> `approved` on final approval
- `in_review` -> `returned` on return for correction
- `returned` -> `in_review` on resubmit
- `in_review` -> `rejected` on reject

Rules:

- Do not allow approval from `draft`, `published`, `returned`, `approved`, or `rejected`.
- Do not allow resubmission unless the application is `returned`.
- Do not allow rejected applications to re-enter review.
- Keep workflow decisions in testable workflow/policy modules.

## Return For Correction

Return for correction is a core product differentiator.

Rules:

- Approver must provide a correction comment or reason.
- Correction request must preserve target form fields.
- Applicant should edit only the returned fields.
- Backend must enforce editable field restrictions on resubmit.
- Correction history should remain visible from application detail or review history.
- Open correction requests should be resolved or marked handled on resubmission.

This feature should be explained in portfolio docs because it demonstrates workflow depth beyond simple approve/reject.

## Audit Logs

Audit logs should record important business operations, for example:

- tenant signup
- login-sensitive account events where applicable
- user invitation, role change, delete, restore
- space create/update/delete/member changes
- form definition create/update/publish/archive
- approval flow create/update
- application submit/resubmit
- approval
- return for correction
- rejection
- CSV export creation/download where applicable

Audit log records should include enough context to answer:

- who performed the action
- which tenant it belongs to
- which space/group it belongs to, if any
- what resource changed
- when it happened
- what action/event type occurred

Do not mix audit logs with request logs. Request logs help operations; audit logs prove business history.

## Portfolio Review Checklist

When improving README or docs, make these strengths visible:

- Screens and API model the same workflow.
- Backend enforces tenant and authorization rules.
- State transitions are explicit and tested.
- Correction and resubmission are first-class, not comments attached to a CRUD row.
- CSV export and audit logs show operational completeness.
- OpenAPI-generated types reduce frontend/backend drift.
- The architecture separates UI, API contracts, business rules, persistence, and audit logging.
