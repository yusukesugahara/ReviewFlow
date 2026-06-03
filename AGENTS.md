## Design Principles for Implementation and Refactoring

Use the following design principles whenever implementing, refactoring, or reviewing code.
These principles are not abstract ideals; apply them to decide where code should live and how changes should be structured.

### Separation of Responsibilities

Do not mix unrelated responsibilities in the same function, class, component, module, or route.

Keep these concerns separate:

- Request/response mapping
- UI rendering and user interaction
- Input validation
- Authorization decisions
- Business rules
- Workflow/state transitions
- Database access
- External API integration
- Notifications
- Request logging
- Business audit logging

A change is usually a design smell when one file must handle validation, authorization, workflow, persistence, and response formatting at the same time.

### Single Responsibility

Each module should have one clear reason to change.

Prefer focused modules such as:

- `ApplicationAccessPolicy` for permission decisions
- `ApplicationWorkflow` for approval, rejection, and correction state transitions
- `ApplicationFormValueValidator` for application/form value validation
- Repository classes/functions for persistence
- Mapper/presenter functions for response shaping
- Notification services for emails or external notifications
- Audit log services for business event recording

If a service grows too large, split it by responsibility instead of adding more private helper methods to the same class.

### Separation of Concerns by Layer

Respect the ownership of each layer:

- Controllers should be thin and should not contain business rules.
- Backend services should coordinate use cases.
- Policies should decide whether an action is allowed.
- Validators should decide whether input or state is valid.
- Workflow/domain modules should own state transitions.
- Repositories should own database access.
- Frontend components should focus on UI, form state, and user interaction.
- Frontend server actions/routes may coordinate backend calls, but should not become the source of business rules.

The frontend may hide buttons or routes for usability, but the backend must enforce the actual rule.

### High Cohesion and Low Coupling

Keep related logic together and avoid spreading the same business rule across many files.

Prefer this:

```ts
applicationAccessPolicy.canApprove(user, application)
```

Over repeated checks like this in controllers, services, and UI components:

```ts
user.role === 'tenant_admin' || application.currentAssigneeUserId === user.id
```

Duplicated role, tenant, status, or workflow checks should usually be extracted into a policy, validator, or workflow module.

### DRY, but Avoid Premature Abstraction

Do not duplicate business knowledge.

However, do not abstract code only because it looks similar.
Small duplication is acceptable when the behavior may diverge.

Abstract when:

- The same business rule appears in multiple places
- Authorization or validation logic is repeated
- A workflow transition is implemented in more than one place
- The same API response mapping is repeatedly hand-written

Do not abstract when:

- The similarity is only superficial
- The abstraction makes the code harder to read
- The future reuse is speculative

### KISS and YAGNI

Prefer the simplest implementation that satisfies the current requirement.

Do not add:

- Generic frameworks
- Unused extension points
- Unnecessary interfaces
- New packages
- New state libraries
- Complex patterns only because they may be useful later

Introduce abstraction after there is a real repeated responsibility or clear ownership boundary.

### Testability as a Design Signal

Important business logic should be testable without rendering a UI, starting HTTP, or relying on real external services where practical.

If code is hard to test, first check whether it mixes responsibilities.

Prefer pure or near-pure modules for:

- Authorization policies
- Workflow transitions
- Validation rules
- Mapping functions
- Date/status decision logic

Avoid hiding important rules inside:

- React components
- NestJS controllers
- Database query builders
- Inline route handlers
- Ad hoc utility functions with unclear ownership

### Explicit Intent Over Cleverness

Prefer names that describe the business action.

Prefer:

```ts
submitApplication()
approveApplication()
returnApplicationForCorrection()
```

Over vague names like:

```ts
process()
handle()
update()
execute()
```

Short code is not automatically better. Code should make the intent and responsibility obvious.

### Dependency Direction

Keep dependency direction understandable:

```text
Controller / Route
  -> Use case service
    -> Policy / Validator / Workflow
      -> Repository / External gateway
```

Avoid business rules depending directly on HTTP, React, database entities, or framework-specific behavior when a simpler plain TypeScript module would work.