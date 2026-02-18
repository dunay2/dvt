# ADR-0007: Temporal Retry Policy for MVP Interpreter Runtime

- **Status**: Accepted
- **Date**: 2026-02-18
- **Owners**: Engine/Temporal adapter maintainers
- **Related files**:
  - [`RunPlanWorkflow.ts`](../../packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
  - [`stepActivities.ts`](../../packages/adapter-temporal/src/activities/stepActivities.ts)
  - [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts)
  - [`workflow-retry-policy.test.ts`](../../packages/adapter-temporal/test/workflow-retry-policy.test.ts)

---

## Context

Issue `#15` upgraded the Temporal interpreter from sequential MVP behavior to deterministic DAG execution with continue-as-new support.

For production-facing resilience, the workflow needed a clear, deterministic retry/error policy so that:

1. Transient activity failures retry automatically under controlled backoff.
2. Permanent failures terminate deterministically without retry storms.
3. Event projection always reaches a terminal state (`COMPLETED` or `FAILED`) without limbo.

---

## Decision

### 1) Retry defaults at workflow activity boundary

Activity proxy retry policy in [`runPlanWorkflow()`](../../packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:103) is pinned to:

- `initialInterval: '1s'`
- `maximumInterval: '60s'`
- `backoffCoefficient: 2`
- `maximumAttempts: 3`
- `nonRetryableErrorTypes: ['PermanentStepError']`

### 2) Permanent failure classification

Activities may raise `PermanentStepError` (non-retryable) from [`executeStep()`](../../packages/adapter-temporal/src/activities/stepActivities.ts:85).

When surfaced to workflow-level execution, failure is mapped deterministically to:

1. `StepFailed` event
2. `RunFailed` event
3. Terminal workflow result `FAILED`

### 3) Deterministic replay-safe verification

Policy literals are guarded in [`workflow-retry-policy.test.ts`](../../packages/adapter-temporal/test/workflow-retry-policy.test.ts:1), and E2E behavior is validated in [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts:474).

---

## Consequences

### Positive

- Bounded retries prevent infinite retry loops.
- Failure semantics are explicit and testable.
- Terminal event sequence is deterministic and projector-friendly.

### Trade-offs

- Retry classification remains intentionally simple in MVP (type-based non-retryable split).
- Fine-grained domain error taxonomy remains deferred.

---

## Deferred / Out of Scope

Deferred for follow-up hardening:

- Determinism linting gates in CI for workflow-safe API usage.
- Heartbeats and long-running activity timeout strategy.
- Rich observability metrics (step latency, retry cardinality, error taxonomy).

These remain explicitly tracked in [`TECHNICAL_DEBT_REGISTER.md`](../guides/TECHNICAL_DEBT_REGISTER.md).

---

## Acceptance Criteria

1. Retry literals remain pinned and covered by tests in [`workflow-retry-policy.test.ts`](../../packages/adapter-temporal/test/workflow-retry-policy.test.ts:1).
2. Permanent failure path emits deterministic `StepFailed` + `RunFailed` in [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts:474).
3. Full package suite passes via `pnpm --filter @dvt/adapter-temporal test`.
