---
title: G4-PR4: Admission Control Operability - Implementation Plan
status: Superseded
owner: Architecture / API
last_reviewed: 2026-04-05
planning_type: proposal
---

# G4-PR4: Admission Control Operability - Implementation Plan

## Purpose

Define the smallest clean implementation slice that turns admission-control
observability from a placeholder into an operable runtime surface.

## Diagnosis

`BackpressureAwareStartRunUseCase` already calls `telemetry.recordDecision()`
for every admission outcome:

- `accept`
- `duplicate`
- `reject_tenant`
- `reject_system`
- `would_reject_tenant`
- `would_reject_system`

The real missing behavior is that `NoopAdmissionTelemetry` drops every call.

Two follow-up design issues sit next to that runtime gap:

1. The `AdmissionTelemetry` port uses an optional-field bag, which weakens
   interface clarity and makes exhaustive handling harder.
2. Capacity gauges such as queue depth and outbox lag are observable in the
   backpressure store but are not emitted through the runtime telemetry path.

## Scope

This proposal covers:

- admission decision telemetry for `startRun`
- capacity and saturation metrics at the admission boundary
- runtime wiring in `apps/api`
- contract-safe observability evolution for the admission port

This proposal does not cover:

- policy changes to admission thresholds
- planner contract changes
- user-facing dashboard work

## Target State

- Every admission outcome produces a real telemetry event.
- Queue-depth and lag metrics are emitted through a production adapter rather
  than disappearing behind a noop implementation.
- The API composition root wires an explicit admission telemetry adapter.
- The port shape is clear enough to support exhaustive and testable handling.

## Implementation Slices

### Slice 1 - Port normalization

- Replace the optional-field bag with explicit outcome-aware payloads.
- Keep the change backward-compatible at the composition boundary.
- Add focused unit tests for payload shape and exhaustiveness.

### Slice 2 - Production telemetry adapter

- Implement a concrete admission telemetry adapter backed by the repository
  observability surface.
- Preserve the noop adapter only for tests and local isolated wiring.
- Add tests that prove outcome emission and failure isolation.

### Slice 3 - Capacity gauges

- Emit queue-depth and lag metrics from the backpressure path.
- Define stable metric names and labels.
- Document the expected operational meaning of each signal.

### Slice 4 - API runtime wiring

- Wire the production telemetry adapter in `apps/api`.
- Ensure protected runtime routes and admission flow use the same adapter.
- Add integration coverage where the runtime module is assembled.

## Acceptance Criteria

- Admission decisions no longer disappear in production wiring.
- Capacity metrics are emitted with stable names and labels.
- Unit and integration tests cover both decision telemetry and runtime wiring.
- Docs and runtime status surfaces reflect the shipped posture.

## Validation Baseline

- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api test:integration`
- `pnpm verify:prepush`
