---
title: Temporal PlanRef QA1 readiness hardening
status: Accepted
date: 2026-04-27
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/config.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowInputParsingHelpers.ts
  - packages/@dvt/adapter-temporal/test/smoke.test.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts
  - packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md
  - docs/runbooks/temporal-planref-drained-cutover-20260427.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults|keeps explicit zero"
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/TemporalAdapter.startRun.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-execution-segment.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "continues as new"
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This evidence records the `AR-D-PLAN-POINTER` QA1 readiness hardening pass.

The pass closes the immediate Fowler findings without pretending full runtime
maturity is complete:

- Temporal continue-as-new rollover now has a governed non-zero default.
- Explicit `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=0` remains available only as
  a local diagnostic or incident rollback override.
- Workflow input now rejects a missing continue-as-new threshold instead of
  silently defaulting to disabled rollover.
- The drained-deploy cutover posture is documented as the active
  no-retrocompatibility procedure.
- Deep-plan segment resolution has regression coverage proving the returned
  segment carries only the requested layer plus compact metadata.

## Residual Risk

`AR-D-PLAN-POINTER` remains open for the full AR-D2 SLA statement, deeper
segment-scale maturity, and the existing DBT built-in coupling risk in
`@dvt/adapter-temporal`.
