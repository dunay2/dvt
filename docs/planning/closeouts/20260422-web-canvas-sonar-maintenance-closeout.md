---
title: Web Canvas sonar maintenance cleanup
status: In progress
date: 2026-04-22
owners:
  - web
mode: Slim
---

# Web Canvas sonar maintenance cleanup

## Phase 1. Think-First Analysis

### Problem summary

The active `apps/web` Canvas slice carries a cluster of static-analysis smells
across route composition, projection helpers, defaults builders, and tests.
They do not currently indicate one broken behavior, but they do indicate
structural drift in the route-facing authoring seam.

### Root cause

The `TF-E2` hard cut clarified authority and removed retired routes, but some
route-local helpers remained broad:

- tests still carry repeated local selectors or explicit default-parameter calls
- route JSX and presentation helpers still inline conditional logic that belongs
  in named view-model helpers
- projection and defaults modules still contain functions that aggregate too
  many responsibilities in one place

This creates review noise and makes it easier for route composition to regrow
accidental complexity.

### Constraints and invariants

- `AGENTS.md`: no debt, no hidden bypass, package validation plus
  `pnpm verify:prepush` before closeout.
- `docs/guides/ai-work-protocol.md`: this is `Slim` maintenance work because no
  new public API or new external behavior is intended.
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  Canvas route composition must stay explicit, React Flow state remains a
  projection, and semantic authority must not move into route adapters.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  route entry, presentation seams, and read-side projections should narrow
  rather than regrow into broad helper catalogs.

### Options considered

- suppress or ignore the warnings as non-functional noise
- make line-level cosmetic edits only
- extract named helpers and smaller seam-local functions where the warnings
  reveal actual cohesion or readability drift

### Selected option and rationale

Apply small structural cleanups at the seam where the smell appears, while
keeping behavior stable.

This aligns with the current Fowler-oriented target: thinner route composition,
named presentation helpers, and smaller projection/default builders.

### Rejected alternatives

- blanket suppression because it preserves drift
- broad refactors across unrelated Canvas internals because the current request
  is maintenance-scoped

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/services/config/dataSource.test.ts`
  - `apps/web/src/app/views/Canvas.routeStates.test.tsx`
  - `apps/web/src/app/views/Canvas.test.controller.defaults.ts`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts`
  - `apps/web/src/app/views/canvas/CanvasCenterSurface.tsx`
- Expected outcome:
  - local static-analysis warnings are resolved through clearer seam-local code
  - route composition and projection remain behaviorally identical
  - tests stay green in `@dvt/web`
- Risks and mitigations:
  - risk: changing route composition semantics while shrinking helpers
  - mitigation: keep edits narrow, preserve existing tests, and add/adjust tests
    only when they validate the same behavior more directly
- Out of scope:
  - new Canvas behavior
  - new backend capability
  - broad controller-runtime extraction beyond the files above
- Validation plan:
  - targeted eslint/prettier on touched files
  - targeted vitest for touched tests and nearby Canvas route tests
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve current route-state and config-resolution behavior
  - re-run negative or guarded route-state tests touched by helper extraction
- Libraries evaluated:
  - None evaluated - no custom implementation

## 2026-04-29 Follow-Up. Bootstrap And Canvas Static Analysis

### Problem summary

The current editor scan reports three quality issues in the web slice:

- `apps/web/index.html` publishes the startup gate status role on a structural
  container instead of a semantic status output.
- `CanvasPlaygroundTabStrip.templates.tsx` keeps arbitrary Tailwind variable
  syntax where canonical custom-property shorthand is available.
- `CanvasViewport.test.tsx` defines the React Flow `MiniMap` mock with inline
  destructured typed parameters that Sonar reports as malformed JSX properties.

### Root cause

The previous bootstrap and Canvas hardening fixed behavior and architecture,
but it left a few presentation seams optimized for immediacy rather than static
analysis readability. The underlying pattern is not a domain defect; it is
semantic drift at the accessibility and test-template boundary.

### Constraints and invariants

- `AGENTS.md`: no hidden debt, no hook bypass, and close with validation
  evidence.
- `docs/guides/ai-work-protocol.md`: this remains `Slim` maintenance because
  no public API or user workflow changes.
- `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md`:
  startup and canvas templates must preserve the governed route surface,
  template/model split, and static architecture guards.

### Options considered

- Ignore the IDE warnings because repo gates already pass.
- Suppress Sonar locally.
- Make small semantic fixes and add regression coverage where the warnings map
  to a durable rule.

### Selected option and rationale

Apply narrow semantic fixes: use an `<output>` live-region for startup status,
canonicalize Tailwind variable classes, and move the React Flow mock props into
named test-local types/components. This removes the warnings without changing
runtime behavior or weakening the component boundaries.

### Rejected alternatives

- Suppression, because it hides real signal at the accessibility/test
  readability boundary.
- Broader bootstrap redesign, because the current issue is bounded to static
  analysis hygiene.
