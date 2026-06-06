# Frontend components

Use this directory for UI pieces and frontend helpers that are shared across
multiple routes, or are likely to become shared because they represent a common
product concept.

## Import paths

- Shared components and shared frontend helpers should be imported with
  `@/components/...`.
- Route-specific components should stay under that route's `_components`
  directory and be imported with relative paths such as `./_components/...` or
  `./some-local-helper`.
- Do not import shared components from `@/app/**/_components`. Move them into
  `@/components` first.

## Directory responsibilities

- `ui`: low-level reusable UI primitives.
- `applications`: application display, workflow actions, status, routes, and
  dynamic field UI shared across application-related routes.
- `application-setup`: form-definition and approval-flow builder UI shared by
  application creation and editing.
- `space`: shared space-facing presentation components and types.

Keep route orchestration, data fetching, and page-specific layout in `app`.
Move a component here when it is used by multiple route trees, or when keeping it
inside one route would make another route depend on that route's private
structure.

## Barrel exports

Do not add `index.ts` barrel exports by default. Prefer direct imports from the
file that owns the component or helper, for example
`@/components/applications/application-routes`.

Add a barrel only when a directory has a stable public API and direct imports are
creating real maintenance cost.

## Tests

Keep the current test grouping under `__test__/components`, `__test__/pages`,
and `__test__/utils`.

- Tests for shared components in this directory belong in `__test__/components`.
- Tests for route-specific `_components` can also stay in `__test__/components`
  when they exercise a component directly.
- Route orchestration and data mapping tests belong in `__test__/pages` or
  `__test__/utils`, matching the behavior being tested.

Avoid moving tests next to source files unless the project adopts colocated
tests consistently.

## Component catalog

This project does not currently use Storybook or a component catalog. Do not add
Storybook only because a component moves into `@/components`; it adds packages,
scripts, and maintenance overhead.

Reconsider a catalog when shared components need visual review across multiple
states, or when UI changes start requiring repeated manual checks across pages.
