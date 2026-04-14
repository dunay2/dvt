---
slice: TF-A1-D-web-plan-anti-corruption
date: 2026-04-14
lane: A
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: TF-A1-D web plan anti-corruption layer

## Think-First Analysis

### Problem summary

The SQL-first preview or run path in `apps/web` still crosses the planning
boundary through the legacy `types/dbt.ts` `ExecutionPlan` DTO.

That means the active plans port, plans adapter, canvas execution hooks, and
plan preview modal all depend on a dbt-centric presentation model even after the
planner contracts and API routes were hardened into smaller seams.

### Root cause

The previous SRP refactor decomposed convenience modules, but it did not insert
an anti-corruption layer between canonical planner contracts and the web
presentation model.

As a result, the transport adapter still normalizes canonical step kinds into
`DBT_*` labels and the plan port still advertises the legacy dbt DTO as its
primary contract.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven execution, no debt, and full
  validation including `pnpm verify:prepush`.
- `docs/architecture/reference-architecture.md`: hexagonal architecture and
  replaceable infrastructure behind ports.
- `docs/planning/execution-model/dvt-execution-model.md`: bounded contexts stay
  separate; UX renders read models and submits commands but does not own planner
  semantics.
- `ADR-0005`: contract-backed boundaries remain machine-validated.
- `ADR-0018`: shared kernel stays narrow; consumers should not redefine public
  contract semantics locally.

### Selected option and rationale

Introduce a web-local planning view model and use it as the return type of
`IPlansPort`, the API adapter, and the active canvas/store/modal surfaces.

This preserves the existing UI behavior, but it stops the plan-flow from
depending on `types/dbt.ts` and keeps canonical step kinds intact at the
anti-corruption layer instead of coercing them into `DBT_*`.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/ports/plans.ts`
  - `apps/web/src/app/services/plans/**`
  - `apps/web/src/app/views/canvas/**`
  - `apps/web/src/app/components/Modals.tsx`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/stores/{executionStore.ts,appStore.ts}`
  - `apps/web/src/app/plugins/contracts/PluginServices.ts`
  - `apps/web/src/app/types/plans.ts`
  - `docs/planning/state/agent-lane-a.yaml`
- Expected outcome:
  - the web plans port exposes a planning view model local to `web`
  - canonical step kinds are preserved across the API adapter
  - active canvas planning surfaces no longer import plan semantics from
    `types/dbt.ts`
- Risks and mitigations:
  - Risk: test fixtures and modal rendering drift during the type cutover
  - Mitigation: preserve structural plan shape where possible and validate
    `plansService`, `canvas`, and modal tests together
  - Risk: residual consumers still depend on the legacy dbt plan DTO
  - Mitigation: scope the first cut to the active preview/run path and record
    remaining consumers honestly in the residual section
- Out of scope:
  - replacing all `dbt`-named UI types in the repository
  - changing run view-models or plugin runtime contracts outside the active plan
    preview path

## Implementation Summary

- Added `apps/web/src/app/types/plans.ts` as the web-local planning view model
  for the active preview or run path.
- Cut the plans port and API adapter over to that view model:
  - `apps/web/src/app/ports/plans.ts`
  - `apps/web/src/app/services/plans/plansService.api.ts`
- Preserved canonical step kinds across the transport mapping instead of
  coercing plan steps into `DBT_COMPILE`, `DBT_RUN`, or `DBT_TEST`.
- Cut the active canvas and plan preview surfaces over to the local plan view
  model:
  - `apps/web/src/app/views/canvas/*.ts`
  - `apps/web/src/app/views/Canvas.tsx`
  - `apps/web/src/app/components/Modals.tsx`
  - `apps/web/src/app/stores/{executionStore.ts,appStore.ts}`
  - `apps/web/src/app/plugins/contracts/PluginServices.ts`
- Left the broader frontend legacy `dbt` model outside the slice; this change is
  limited to the active planning boundary, not the whole UI type system.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/web/src/app/types/plans.ts apps/web/src/app/ports/plans.ts apps/web/src/app/services/plans/plansService.api.ts apps/web/src/app/services/plans/plansService.test.ts apps/web/src/app/components/Modals.tsx apps/web/src/app/plugins/contracts/PluginServices.ts apps/web/src/app/stores/executionStore.ts apps/web/src/app/stores/appStore.ts apps/web/src/app/views/Canvas.tsx apps/web/src/app/views/canvas/canvasPlanAction.ts apps/web/src/app/views/canvas/canvasPlanReadiness.ts apps/web/src/app/views/canvas/canvasRunStartAction.ts apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.ts apps/web/src/app/views/canvas/useCanvasExecutionActions.ts apps/web/src/app/views/canvas/useCanvasExecutionActions.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm --filter @dvt/web test -- plansService.test.ts useCanvasExecutionActions.test.tsx Modals.test.tsx useCanvasController.core.test.tsx` - PASS

## Residuals

- The broader frontend legacy model under `apps/web/src/app/types/dbt.ts`
  remains in use for non-planning surfaces and for historical mocks. This slice
  only removes that dependency from the active plan preview or run boundary.
