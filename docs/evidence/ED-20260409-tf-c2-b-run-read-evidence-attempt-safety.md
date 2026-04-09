---
title: Harden run read evidence model with logical-attempt safety and runtime evidence payloads
status: Accepted
date: 2026-04-09
owners:
  - apps/api
  - packages/@dvt/adapter-temporal
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/runReadEvidenceModel.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/schemas.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test -- test/compiled-code-ref.contract.test.ts
    - pnpm --filter @dvt/adapter-temporal exec tsc -p tsconfig.json --noEmit
    - pnpm --filter @dvt/adapter-temporal test -- test/activities.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.time-skipping.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - pnpm verify:prepush
---

## Summary

This slice makes runtime result evidence caller-visible on `/runs/:runId` and `/runs/:runId/events` while keeping diagnostics scoped to the latest logical attempt.

## Scope

1. Contracts now carry structured runtime result evidence and materialization fields.
2. Temporal adapter emits deterministic payloads for started/completed/failed signals with evidence.
3. API read model derives executor, step attribution, failure reason, and materialization without leaking stale evidence across logical attempts.
4. Frontend run workspace consumes the snapshot-first evidence path and only falls back to current-attempt timeline events.

## Residual considerations

1. Read-model computation still scans event history; follow-up optimization can pre-aggregate evidence into snapshot projections.
2. Module typing for `planStore` read capabilities remains a follow-up hardening point.
