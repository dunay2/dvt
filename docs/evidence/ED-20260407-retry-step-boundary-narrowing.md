---
title: Narrow RETRY_STEP out of canonical signal contracts
status: Accepted
date: 2026-04-07
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
  - packages/@dvt/engine/src/core/idempotency.ts
  - packages/@dvt/engine/src/core/lifecycle/coreRuntime.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/engine/test/idempotency.vectors.test.ts
  - packages/@dvt/contracts/test/validation.test.ts
  - packages/@dvt/contracts/test/signalSemantics.test.ts
  - docs/adr/ADR-0048-retry-step-as-separate-engine-use-case.md
  - docs/planning/reviews/architecture-and-governance/20260407-retry-step-boundary-and-use-case-review.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test -- test/idempotency.vectors.test.ts test/core/WorkflowEngineCoreService.test.ts
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice narrows the canonical run-control signal boundary by removing
`RETRY_STEP` from `SignalType` and from `SignalRequest` validation.

The architectural decision is governed by `ADR-0048`, which formalizes that
future step-scoped retry must be introduced as a dedicated engine or
application use case rather than as `signal(..., { type: 'RETRY_STEP' })`.

## What changed

- Removed `RETRY_STEP` from the canonical `SignalType` contract and schema.
- Removed step-scoped retry payload from `SignalRequest`.
- Removed the Temporal provider signal branch that previously advertised
  `RETRY_STEP` as a future runtime signal.
- Updated signal idempotency documentation and vectors so signal identity no
  longer includes a step-specific suffix.
- Added explicit engine idempotency coverage for signal vectors after
  `RETRY_STEP` removal.
- Updated active signal and execution docs so they no longer present
  `RETRY_STEP` as part of the generic signal boundary.
- Recorded the boundary rationale in an ADR and in a development review before
  implementation.

## Expected effect

- Canonical signal vocabulary no longer advertises speculative `RETRY_STEP` support.
- Consumers can no longer bind to a speculative `RETRY_STEP` signal path; `RETRY_RUN` posture remains a separate API/product decision.
- Any future step retry feature must declare its own engine semantics,
  authorization, admission rules, and adapter capability behavior explicitly.
