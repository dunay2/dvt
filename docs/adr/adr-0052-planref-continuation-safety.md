---
title: PlanRef continuation safety
status: Accepted
date: 2026-04-30
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
---

# ADR-0052: PlanRef Continuation Safety

## Context

`AR-D-PLAN-POINTER` moved Temporal workflow start and `continueAsNew` input to
`PlanRef` plus compact cursor state. That removed the full-plan durable input
anti-pattern, but left three continuation hazards under-specified:

1. `PlanRef.expiresAt` could expire while a long workflow is still executing.
2. `WorkflowExecutionCursor.processedControlSignalIds` could grow without bound
   under repeated pause/resume/cancel traffic.
3. Continuation failures could surface as generic workflow failure instead of
   governed runtime reasons.

## Decision

DVT treats continuation safety as part of the runtime contract, not as an
adapter-local implementation detail.

1. A `PlanRef` whose `expiresAt` is at or before validation time MUST fail
   closed as `PLAN_REF_EXPIRED` before provider dispatch or runtime segment
   execution fetches plan bytes.
2. A valid non-expired `PlanRef` whose plan bytes cannot be read during segment
   resolution MUST be reported as `PLAN_REF_UNAVAILABLE`.
3. A cursor payload that still exceeds the configured continue-as-new payload
   budget after compaction MUST be reported as `CURSOR_OVERFLOW`.
4. The Temporal cursor MUST retain only a bounded recent window of processed
   control-signal ids across `continueAsNew`; the cursor is not an append-only
   event log.
5. The event-sourced run lifecycle remains authoritative. These runtime
   failures are represented as `RunFailed.reason` values, not provider-native
   status strings.

## Consequences

- `PlanRef.expiresAt` is now an executable lifecycle guard.
- Long-running workflows no longer carry an unbounded signal-id list through
  every continuation.
- Operators and tests can distinguish cursor overflow, expired plan pointer,
  and unavailable plan artifact from generic workflow failure.
- Deployments still need an AR-D2 SLA for maximum history size, segment count,
  and plan retention policy; this ADR defines failure semantics and cursor
  bounding, not the final production capacity envelope.

## Validation

- `packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`
- `packages/@dvt/engine/test/contracts/engine.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/adapter-temporal/test/workflowRuntimePayloadHelpers.test.ts`
