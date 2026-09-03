---
title: VTX2 preview contract hard cut evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
  - api
  - web
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts
  - apps/api/src/application/services/PreviewPlanUseCase.ts
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
  - scripts/supported-runtime-proof/runtime-proof-workload.cjs
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api test:unit
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web test:changed
    - node --test scripts/supported-runtime-proof/runtime-proof-workload.test.cjs
    - pnpm verify:prepush
---

# VTX2 preview contract hard cut evidence

## Scope

Issue #2600 removes the retired SQL-first preview ingress after VTX2 Substrait
became the sole DVT transformation authoring authority. The shared Preview rail
now admits only `planner-generic-v1`; DVT Canvas no longer constructs, persists,
or routes a SQL-shaped design graph or preview provenance envelope.

The cut removes the compiler/design-graph contracts, the specialized API
planner branch, frontend builders and provenance helpers, and the end-to-end
suites that asserted the retired behavior. Generic DBT preview, selected
closure, plan persistence, validation, import, and run admission remain on the
existing canonical rails.

## Boundary evidence

`PreviewExecutionPlan` remains the single query rail and `CompilePlan` remains
the explicit command rail. No alternate command, query, route, service, store,
or compatibility alias was added. Runtime-only SQL step handlers are explicitly
outside this slice and remain owned by the next ordered #2600 hard cut.

The contract rejection test proves that `transformation-sql-first-v2` cannot be
parsed. Web adapter tests are split into behavior suites under 200 lines and
exercise accepted generic preview, typed rejection, canonical retry mapping,
and backend-owned import identity without asserting retired literal payloads.
