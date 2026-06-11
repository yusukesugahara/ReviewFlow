---
name: nextjs-responsibility-separation
description: Use this skill when reviewing or refactoring a Next.js / React / TypeScript project for responsibility separation, file organization, component boundaries, business rules, data fetching, formatting, and avoiding over-splitting.
---

# Next.js Responsibility Separation Review

Use this skill when reviewing or refactoring a Next.js / React / TypeScript project.

## Core Principle

Responsibility separation does not mean splitting files as much as possible.

It means separating code by **reason to change**.

- Keep things together when they change for the same reason.
- Separate things when they change for different reasons.
- Keep things close when they are usually read together.
- If splitting files makes the code harder to understand, suggest merging them.

## Reason to Change Categories

### 1. UI changes

These are changes caused by presentation or layout requirements.

Examples:

- Layout changes
- Button appearance changes
- Badge color changes
- Display text changes
- Table or card layout changes

Recommended locations:

- `_components/`
- Page-specific `_components/`

### 2. Business rule changes

These are changes caused by domain rules, permissions, workflow, or state transitions.

Examples:

- Who can approve an application
- Who can request correction
- Who can resubmit
- Whether the applicant can approve their own application
- Whether tenant_admin has special permissions
- State transition rules
- Validation rules based on business requirements

Recommended locations:

- `_rules/`
- `_domain/`
- `_policies/`

Example function names:

- `canApproveApplication`
- `canRequestCorrection`
- `canResubmitApplication`
- `validateApplicationValues`
- `getNextApplicationStatus`

### 3. Data fetching and mutation changes

These are changes caused by API, server actions, repositories, or request/response shape.

Examples:

- API endpoint changes
- OpenAPI client usage changes
- Server Component vs Server Action decisions
- Request parameters change
- Response shape changes
- Mutation logic changes

Recommended locations:

- `_actions/`
- `_api/`
- `_repositories/`

### 4. Display formatting changes

These are changes caused by formatting values for display.

Examples:

- Date formatting
- Status label conversion
- Currency formatting
- Number formatting

Recommended locations:

- `_utils/`
- `_formatters/`

Do not extract very small one-off formatting logic unless it improves readability or testability.

## Review Criteria

When deciding whether to split or merge files, check:

1. Is this reused?
2. Is this important enough to test?
3. Does the file name clearly explain its role?
4. Are UI and business rules mixed together?
5. Does splitting make the code easier or harder to read?
6. Is page-specific code being prematurely moved to shared directories?
7. Would a future change request make the target file obvious?
8. Are files being split only because they are visually long, not because they have different responsibilities?

## Avoid Over-Splitting

Avoid creating many vague files such as:

- `Header.tsx`
- `Body.tsx`
- `Content.tsx`
- `Item.tsx`
- `Parts.tsx`
- `Helper.ts`
- `index.ts`

Avoid splitting simple JSX into too many tiny files when there is no reuse, no business logic, and no test value.

For example, avoid this unless each file has a clear reason to exist:

```txt
ApplicationListHeader.tsx
ApplicationListBody.tsx
ApplicationListRow.tsx
ApplicationListCell.tsx
ApplicationListDate.tsx
ApplicationListName.tsx
```

If these are simple presentational fragments used only in one place, suggest merging them into a larger component.

## Recommended Next.js Structure

Prefer colocating page-specific code near the page.

```txt
app/
  space/
    [spaceId]/
      applications/
        page.tsx
        _components/
        _actions/
        _rules/
        _utils/
```

Move code to shared directories only when reuse is clear.

```txt
components/
features/
lib/
shared/
```

Do not move code to shared directories just because it might be reused someday.

## Page Component Responsibility

`page.tsx` should mainly handle:

- Route-level composition
- Calling data-fetching functions
- Passing data to page components
- Keeping the overall page flow understandable

Avoid putting complex business rules directly in `page.tsx`.

## Component Responsibility

Components should mainly handle:

- Rendering UI
- Receiving props
- Calling UI event handlers
- Displaying formatted values

Avoid putting permission checks, workflow rules, and complex status transitions directly inside UI components.

If a component contains logic like this:

```ts
if (user.role === 'tenant_admin' && application.status === 'pending') {
  // approve
}
```

consider extracting it into a rule or policy function:

```ts
canApproveApplication(user, application)
```

## Refactoring Review Output

When reviewing code, respond with:

1. Good separation points
2. Areas that are over-split
3. Areas that should be separated more
4. Mixed UI / business rule / data fetching concerns
5. Recommended directory structure
6. Concrete refactoring steps
7. Priority order

## Goal

The goal is not to increase file count.

The goal is:

- Future changes have an obvious place to go
- UI and business rules are not mixed
- Testable logic is extracted
- Page-specific code stays near the page
- Small non-reused UI is not over-split
- File names clearly show responsibility
- Developers can understand the code without excessive file jumping
