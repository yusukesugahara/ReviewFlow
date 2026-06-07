# UI Design Rules

## Purpose

This file defines the UI design rules for this portfolio application.

AI coding agents must read and follow this file before generating or modifying UI code.

The goal is to build a clean, consistent, modern B2B SaaS-style interface using:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible components (Radix UI + CVA + Tailwind; official shadcn CLI is not used)

The UI should demonstrate not only visual quality, but also an understanding of business workflows, maintainable frontend architecture, permissions, status management, and usability.

---

## 1. Design Goal

The application must look and feel like a polished business SaaS dashboard.

The design should be:

- Clean
- Professional
- Trustworthy
- Simple
- Easy to understand
- Suitable for business users
- Consistent across all pages

Do not create a flashy, playful, or overly decorative design.

Prioritize:

1. Clarity
2. Consistency
3. Usability
4. Maintainability
5. Accessibility

---

## 2. UI Library Rule

Use `shadcn/ui` as the primary UI component system.

Prefer shadcn/ui components for:

- `Button`
- `Card`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Dialog`
- `Sheet`
- `DropdownMenu`
- `Table`
- `Badge`
- `Tabs`
- `Alert`
- `Skeleton`
- `Separator`
- `Tooltip`
- `Form`
- `Toast` / `Sonner`

Do not create custom UI components from scratch when shadcn/ui already provides a suitable component.

Custom components are allowed only when they wrap or compose shadcn/ui components into reusable application-specific patterns.

Good examples:

- `PageHeader`
- `EmptyState`
- `StatusBadge`
- `DataTable`
- `FormSection`
- `DetailSection`
- `ConfirmDialog`

Bad examples:

- Creating a custom button instead of using `Button`
- Creating a custom modal instead of using `Dialog`
- Creating a custom select instead of using `Select`

---

## 3. Tailwind CSS Rule

Use Tailwind CSS utility classes.

Use semantic shadcn/ui theme tokens instead of hard-coded colors.

Prefer:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `bg-muted`
- `bg-card`
- `text-card-foreground`
- `border-border`
- `bg-primary`
- `text-primary-foreground`
- `bg-destructive`
- `text-destructive-foreground`

Avoid hard-coded color classes unless there is a clear reason.

Avoid:

- `text-gray-500`
- `bg-blue-500`
- `border-gray-200`
- `text-red-600`
- `bg-green-100`

Use semantic styling through the theme whenever possible.

---

## 4. Layout Rule

Use a consistent SaaS dashboard layout.

Recommended structure:

- Left sidebar for main navigation
- Top header for page title, primary actions, and user menu
- Main content area with consistent padding
- Cards for grouped information
- Tables for list views
- Detail pages split into sections

Use consistent spacing:

- Page wrapper: `space-y-6`
- Page padding: `p-6` or `px-6 py-6`
- Section spacing: `space-y-6`
- Card content spacing: `space-y-4`
- Form field spacing: `space-y-4`
- Button group spacing: `gap-2`

Avoid dense layouts.

Every screen should have enough whitespace so that business users can scan it quickly.

---

## 5. Page Structure Rule

Every main page should follow this structure:

1. Page header
2. Short description
3. Primary action
4. Main content
5. Empty, loading, and error states when needed

Recommended structure:

```tsx
<div className="space-y-6">
  <PageHeader
    title="Applications"
    description="Manage submitted applications and approval status."
    action={<Button>Create Application</Button>}
  />

  <Card>
    <CardHeader>
      <CardTitle>Application List</CardTitle>
      <CardDescription>
        Review and manage submitted applications.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* Main content */}
    </CardContent>
  </Card>
</div>
```

If `PageHeader` does not exist, create it as a reusable component.

---

## 6. Typography Rule

Use a simple and consistent typography scale.

Recommended classes:

- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-semibold`
- Card title: use `CardTitle`
- Body text: `text-sm`
- Sub text: `text-sm text-muted-foreground`
- Label: use shadcn/ui `Label`

Avoid using too many font sizes.

Do not use large decorative headings unless the page is a landing page.

For dashboard and admin screens, prioritize readability over visual impact.

---

## 7. Button Rule

Use button variants consistently.

Recommended usage:

- Primary action: `<Button>`
- Secondary action: `<Button variant="outline">`
- Low-priority action: `<Button variant="ghost">`
- Dangerous action: `<Button variant="destructive">`

Examples:

```tsx
<Button>Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">View details</Button>
<Button variant="destructive">Delete</Button>
```

Rules:

- Each screen should have one clear primary action.
- Do not place too many primary buttons on one screen.
- Destructive actions must use `variant="destructive"`.
- Destructive actions should usually require confirmation.
- Button labels must be specific.

Good:

- `Create Application`
- `Submit for Approval`
- `Approve`
- `Return for Correction`

Bad:

- `OK`
- `Do`
- `Click`
- `Process`

---

## 8. Form Rule

Forms must be easy to scan and validate.

Rules:

- Every input must have a label.
- Required fields should be visually clear.
- Validation errors must appear near the relevant field.
- Use helper text when the field is not obvious.
- Group related fields into cards or sections.
- Disable submit buttons while submitting.
- Show a loading state during submission.
- Keep submit and cancel buttons consistently placed.

Recommended structure:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Basic Information</CardTitle>
    <CardDescription>
      Enter the required information for this application.
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Form fields */}
  </CardContent>
</Card>
```

For complex forms, prefer a dedicated page over a large dialog.

---

## 9. Table Rule

Use tables for list and management screens.

Tables should include:

- Clear column names
- Main entity name as a clickable link
- Status badge
- Created or updated date when useful
- Row actions using `DropdownMenu`
- Empty state when there is no data

Rules:

- Do not put too many actions directly in each row.
- Use a row action menu for secondary actions.
- Keep columns business-friendly.
- Do not expose raw database field names to users.

Good column names:

- `Title`
- `Status`
- `Applicant`
- `Current Approver`
- `Submitted At`
- `Updated At`

Bad column names:

- `application_id`
- `tenant_id`
- `group_id`
- `assignee_user_id`

---

## 10. Status Badge Rule

Use `Badge` for status values.

Status labels must be short, clear, and business-friendly.

Examples:

```tsx
<Badge variant="secondary">下書き</Badge>
<Badge>レビュー中</Badge>
<Badge variant="outline">差し戻し</Badge>
<Badge variant="destructive">却下</Badge>
```

Rules:

- Do not rely only on color.
- The text must clearly explain the status.
- Keep labels short.
- Use consistent wording across the app.

Recommended status labels (aligned with `APPLICATION_STATUS_LABELS` in the frontend):

- `下書き` (`draft`)
- `公開済み` (`published`)
- `レビュー中` (`in_review`)
- `差し戻し` (`returned`)
- `承認` (`approved`)
- `却下` (`rejected`)

---

## 11. Empty State Rule

Every list screen must have an empty state.

An empty state should include:

1. Short title
2. Simple explanation
3. Primary action if available

Example:

```tsx
<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
  <h3 className="text-lg font-semibold">No applications yet</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Create your first application to start the approval workflow.
  </p>
  <Button className="mt-4">Create Application</Button>
</div>
```

Avoid blank pages.

Avoid showing only `No data`.

---

## 12. Loading State Rule

Use `Skeleton` for loading states.

Avoid plain text such as:

```txt
Loading...
```

Use skeletons for:

- Page headers
- Cards
- Tables
- Detail sections

Example:

```tsx
<div className="space-y-3">
  <Skeleton className="h-8 w-[240px]" />
  <Skeleton className="h-32 w-full" />
</div>
```

Buttons that submit data should show a pending state and be disabled while processing.

---

## 13. Error State Rule

Error messages must be clear and actionable.

Bad:

```txt
Error occurred
```

Good:

```txt
Failed to load applications. Please try again.
```

Use `Alert` for page-level errors.

Example:

```tsx
<Alert variant="destructive">
  <AlertTitle>Failed to load data</AlertTitle>
  <AlertDescription>
    Please refresh the page or try again later.
  </AlertDescription>
</Alert>
```

Rules:

- Explain what failed.
- Suggest what the user can do.
- Do not expose internal error details unless the app is in development mode.

---

## 14. Dialog Rule

Use dialogs only for focused actions.

Good use cases:

- Confirm delete
- Confirm submit
- Edit a small amount of information
- Show an important warning

Avoid using dialogs for:

- Large forms
- Multi-step workflows
- Complex approval operations
- Pages with many fields

For complex operations, use a dedicated page.

---

## 15. Navigation Rule

Navigation should be task-based, not database-based.

Good navigation labels:

- Dashboard
- Applications
- Approval Requests
- Form Templates
- Members
- Settings

Bad navigation labels:

- ApplicationEntity
- ApprovalFlowTable
- UserModel
- GroupData

Rules:

- Use user-facing language.
- Keep navigation labels short.
- Group related items when needed.
- Make the current page visually clear.

---

## 16. Naming Rule

UI text must be business-friendly.

Prefer:

- Application
- Approval Flow
- Form Template
- Workspace
- Member
- Status
- Submitted At
- Approved At

Avoid showing technical terms directly:

- `tenantId`
- `groupId`
- `applicationId`
- `assigneeUserId`
- enum names
- raw API field names

Technical IDs should not be shown unless they are necessary for debugging or administration.

---

## 17. Accessibility Rule

Follow basic accessibility requirements.

Rules:

- Use semantic HTML.
- Use buttons for actions.
- Use links for navigation.
- Every form field must have a label.
- Do not remove focus styles.
- Ensure keyboard operation works.
- Ensure sufficient color contrast.
- Do not rely only on color to communicate status.
- Use `aria-label` when an icon button has no visible text.

Icon-only buttons must have accessible labels.

Example:

```tsx
<Button variant="ghost" size="icon" aria-label="Open menu">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

---

## 18. Responsive Rule

The app should be desktop-first, but must not break on mobile.

Rules:

- Use responsive spacing.
- Use flexible layouts.
- Tables should support horizontal scroll.
- Sidebar should become a `Sheet` on mobile.
- Avoid fixed widths unless necessary.
- Use `max-w-*` for readable content width.

Example:

```tsx
<div className="overflow-x-auto">
  <Table>
    {/* Table content */}
  </Table>
</div>
```

---

## 19. Reusable Component Rule

Create reusable components when the same UI pattern appears multiple times.

Recommended components:

- `PageHeader`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `StatusBadge`
- `DataTable`
- `ConfirmDialog`
- `FormSection`
- `DetailSection`
- `PageShell`

Rules:

- Do not duplicate the same layout code across pages.
- Prefer composition over large components.
- Keep components small and focused.
- Business logic should not be hidden inside visual components.

---

## 20. Visual Consistency Rule

Keep all screens visually consistent.

Before adding a new screen, check existing screens and match:

- Page header style
- Card structure
- Button placement
- Form spacing
- Table style
- Status badge style
- Empty state style
- Error state style

A new page should feel like it belongs to the same product.

---

## 21. Portfolio Evaluation Rule

This application is a portfolio project.

The UI should demonstrate that the developer can build production-like business software.

The UI should communicate:

- Users can understand where they are.
- Users can understand what they can do.
- Users can understand the current status.
- Users can understand what action is required next.
- Developers can maintain and extend the UI.

Design choices should show practical engineering judgment, not only visual taste.

---

## 22. Prohibited Patterns

Do not use:

- Random hard-coded colors
- Too many font sizes
- Too many primary buttons
- Dense screens with no whitespace
- Large modals for complex workflows
- Inconsistent button labels
- Raw database IDs in user-facing UI
- Custom UI components when shadcn/ui can be used
- Status communicated only by color
- Unclear error messages
- Empty pages with no guidance
- Loading text instead of skeletons
- Technical field names in business screens

---

## 23. AI Agent Instruction

When generating or modifying UI code, AI agents must:

1. Use shadcn/ui components first.
2. Use Tailwind semantic theme tokens.
3. Keep the design consistent with existing screens.
4. Create reusable components for repeated patterns.
5. Include loading, empty, and error states.
6. Use business-friendly labels.
7. Avoid exposing raw technical IDs.
8. Prioritize clarity over decoration.
9. Ensure basic accessibility.
10. Make the UI look like a real B2B SaaS product.

If a design decision is unclear, choose the option that improves clarity, consistency, and maintainability.
