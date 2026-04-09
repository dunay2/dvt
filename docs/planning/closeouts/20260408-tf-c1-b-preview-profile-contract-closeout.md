---
slice: TF-C1-B-preview-profile-contract
date: 2026-04-08
lane: C
author: AI (Codex)
last_reviewed: 2026-04-08
---

# Closeout: TF-C1-B preview profile contract

## Think-First Analysis

### Problem summary

The current `POST /plans/preview` implementation enforces transformation
provenance only after the planner builds a plan, using a heuristic over
compiled step kinds. This makes a caller-visible contract depend on internal
plan shape rather than on an explicit request contract.

### Root cause

The transformation proposal set froze provenance and preview-persist behavior
for the SQL-first vertical, but the preview boundary did not introduce an
explicit discriminator for preview intent. As a result, the route inferred
whether provenance was mandatory from the compiled plan instead of from a
governed request profile.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven behavior changes, no hidden
  debt, no stub behavior, and mandatory validation closeout.
- `docs/guides/ai-work-protocol.md`: this slice is `Full` because it changes a
  public route contract and therefore requires think-first plus pre-
  implementation documentation before code edits.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md`:
  SQL-first preview is validate-plus-persist, SQL artifact provenance is
  required, runtime starts by real `PlanRef`, and phase 2 adds dbt without
  replacing the outer contract.
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`: the
  canonical plan contract allows heterogeneous step kinds, but it does not
  canonically model executor identity at plan level.
- `packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts` and
  `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts`: the
  current runtime executes one run against one adapter and validates that every
  step in the plan is executable on that single adapter.

### Options considered

1. Keep the current step-kind heuristic.
2. Make provenance mandatory for every preview request immediately.
3. Introduce an explicit preview contract discriminator and bind provenance
   requirements to that discriminator.

### Selected option and rationale

Choose option 3.

The route must validate according to an explicit preview contract declared by
the caller, not according to whichever step kinds happen to be emitted by the
planner. This preserves Open/Closed discipline for future provider or artifact
profiles and keeps v1 simple by explicitly freezing `one provider per plan`
instead of implicitly encoding that decision in regexes over compiled steps.

### Rejected alternatives

- Option 1 was rejected because it hard-codes business rules into internal
  step-kind matching and must be edited every time a new flow shape appears.
- Option 2 was rejected because it would collapse all preview modes into the
  SQL-first contract and would not leave room for future governed preview
  profiles with different provenance requirements.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-product-decisions-20260405.md`
  - `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md`
  - `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/state/agent-lane-e.yaml`
  - `apps/api/src/entrypoints/http/planRoutes.ts`
  - `apps/api/src/entrypoints/http/previewProvenanceParser.ts`
  - `apps/api/test/entrypoints/http/planRoutes.test.ts`
  - `apps/web/src/app/ports/plans.ts`
  - `apps/web/src/app/services/plans/plansService.api.ts`
  - `apps/web/src/app/views/canvas/useCanvasExecutionActions.ts`
  - `apps/web/src/app/services/plans/plansService.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasExecutionActions.test.tsx`
- Expected outcome:
  - preview requests declare a governed profile explicitly
  - SQL-first transformation preview requires provenance because its profile
    says so, not because compiled steps match a heuristic
  - v1 remains one-provider-per-plan, while future provider profiles remain
    open for extension
- Risks and mitigations:
  - Risk: docs and lane registry drift from implemented route behavior
  - Mitigation: update proposal docs and task registry before refactoring code
  - Risk: frontend preview flow omits the new discriminator or plan source and
    fails closed
  - Mitigation: wire the current Canvas caller to an explicit generic preview
    profile plus canonical `graphSource`, and keep SQL-first provenance-bound
    profile adoption for a later slice with real Git artifact identity
  - Risk: existing local branch work may be overwritten accidentally
  - Mitigation: absorb and refactor the current branch changes rather than
    resetting the branch
- Out of scope:
  - multi-provider dispatch inside a single run
  - introducing a new runtime adapter such as NiFi in this slice
  - changing the `POST /runs/start` runtime boundary away from `PlanRef`
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preview rejects unknown `previewProfile`
  - SQL-first preview rejects missing provenance before planner build
  - SQL-first preview accepts canonical provenance and returns enriched
    persisted response
  - web preview flow sends an explicit preview profile and canonical
    `graphSource`
  - generic preview profile keeps its own validation path without step-kind
    inference

## Post-QA Corrections

- The generic `planner-generic-v1` route response no longer fabricates
  `planSummary.executor`. Executor identity is now emitted only for profiles
  that are explicitly bound to a governed provider, which keeps the generic
  preview path honest while phase 1 remains PostgreSQL-first.
- Canvas preview step kinds are no longer inferred from provider-specific
  metadata keys. The shell now derives preview step semantics from explicit
  node-kind mapping and only falls back to core role semantics when a node
  kind does not declare a specialized preview step kind.
- Canvas preview staleness no longer hashes raw node metadata. The stale check
  now hashes the same projected `graphSource` payload sent to the API, so only
  payload-affecting changes invalidate the old preview.
- The plugin `plan.preview` contract was aligned with the shell `plans` port so
  the first plugin implementation cannot drift into a parallel preview API.
