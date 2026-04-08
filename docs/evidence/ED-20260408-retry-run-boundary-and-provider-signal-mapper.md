---
title: Retry-run boundary narrowing and provider signal mapper closure
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/workflows.ts
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - packages/@dvt/engine/test/idempotency.vectors.test.ts
  - packages/@dvt/contracts/test/validation.test.ts
  - docs/adr/ADR-0049-retry-run-as-separate-recovery-use-case.md
  - docs/planning/reviews/architecture-and-governance/20260408-retry-run-boundary-and-provider-signal-mapper-review.md
evidence:
  tests:
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test -- test/idempotency.vectors.test.ts test/core/WorkflowEngineCoreService.test.ts test/adapters/MockAdapter.cancel.test.ts
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test -- test/TemporalAdapter.startRun.test.ts test/workflow-literals.test.ts
    - pnpm docs:arc:evidence:check
    - pnpm docs:gov:locations
    - pnpm verify:prepush
---

## Summary

This slice closes the residual signal-boundary drift left after `ADR-0048`.

`RETRY_RUN` is no longer part of canonical `SignalType`. Canonical signals are
now the run-control surface only:

- `PAUSE`
- `RESUME`
- `CANCEL`

Business run recovery remains governed by `ADR-0040`, but it must be expressed
through a future dedicated recovery use case rather than through generic
`signal(...)`.

## What changed

- Removed `RETRY_RUN` from shared `SignalType`, Zod validation, and
  `WorkflowSignals`.
- Added provider mapping helpers in Temporal and mock adapters so canonical
  run-control signals translate explicitly to provider-native commands.
- Updated contract tests and idempotency golden vectors to the narrowed signal
  surface.
- Updated active architecture and contract docs so they no longer present
  `RETRY_RUN` as a generic signal.
- Closed planning task `WE-HX-4-C` and the broader `WE-HX-4` signal-boundary
  cleanup sequence.

## Expected effect

- Generic signal surfaces now match the shipped run-control product posture.
- Adapters fail closed on unsupported signal semantics instead of carrying a
  speculative retry branch.
- Future run recovery can be designed as an explicit recovery command without
  reopening signal ownership drift.
