# Temporal Engine Policies

**Status**: Implementation Snapshot (aligned to current code)  
**Version**: 1.1  
**Engine**: Temporal  
**Contract**: [ExecutionSemantics.v1.md](../../../../ExecutionSemantics.v1.md)

---

## Purpose

This document captures the **actual policies implemented today** in `@dvt/adapter-temporal` and separates them from planned work.

Primary implementation references:

- Adapter API surface: `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- Workflow interpreter: `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- Activities: `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- Worker lifecycle: `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- Mapper/config: `packages/@dvt/adapter-temporal/src/WorkflowMapper.ts`, `packages/@dvt/adapter-temporal/src/config.ts`

---

## 1) Run Identity and Mapping (IMPLEMENTED)

### 1.1 Workflow ID and RunRef

- `workflowId` is derived from `ctx.runId`.
- Temporal task queue is tenant-aware:
  - default: `cfg.taskQueue`
  - tenant-scoped: `${cfg.taskQueue}-${tenantId}` when `tenantId` is non-empty.
- Returned run reference uses:
  - `namespace` from Temporal config
  - `workflowId` from Temporal start response
  - `runId = firstExecutionRunId` when available, else fallback to `ctx.runId`.

### 1.2 Status source of truth

- `getRunStatus()` reads events from state store and projects snapshot (`stateStore.listEvents()` + `projector.rebuild()`).
- The adapter **does not** use workflow query state as operational authority.

---

## 2) Signal and Cancellation Semantics (IMPLEMENTED)

### 2.1 Supported control surface

- Supported control requests in adapter:
  - `PAUSE` → workflow signal `pause`
  - `RESUME` → workflow signal `resume`
  - `CANCEL` → provider-native `workflow.cancel()`
- `RETRY_STEP` and `RETRY_RUN` are explicitly not implemented and throw `NotImplemented`.

### 2.2 Workflow handlers

Workflow defines and handles:

- `pause` signal
- `resume` signal
- `cancel` signal (with reason payload)
- `status` query

Current adapter policy for cancel is canonicalized on `cancel()` instead of the `cancel` signal path so both cancellation entry points share provider-native behavior.

### 2.3 Cancellation reason semantics (CURRENT)

- Workflow defines a `cancel` signal with `reason` payload.
- Current adapter cancellation path uses provider-native `workflow.cancel()` and does **not** send a reason payload first.
- Therefore, `cancelReason` should be treated as **best-effort** and may be empty in runs cancelled through provider-native cancellation.
- In the TypeScript SDK, `WorkflowHandle.cancel()` has no reason parameter, so reason persistence requires explicit signal + state-store eventing when needed.

Consumer guidance for v1.1:

- Treat `cancelReason` as optional in all readers/projections.
- Apply fallback messaging when absent (for example: `Cancelled by system`).
- Emit diagnostic logs/metrics when a reason is expected by product flow but arrives empty.

Planned clarification for a future version:

- Either keep best-effort semantics explicitly, or
- Send `cancel(reason)` signal before native cancel when product requirements need deterministic reason persistence.

---

## 3) Pause/Resume/Cancellation Flow (IMPLEMENTED)

- Workflow state tracks: `status`, `paused`, `cancelled`, `cancelReason`, `currentStepIndex`.
- Before each step, workflow checks cancellation and emits `RunCancelled` when applicable.
- During pause, workflow blocks with `condition(() => !state.paused || state.cancelled)`.
- On pause/resume transitions, lifecycle events are emitted via activities (`RunPaused`, `RunResumed`).
- Step execution emits `StepStarted` and either `StepCompleted` or (`StepFailed` + `RunFailed`).

---

## 4) Activity Policy (IMPLEMENTED)

Workflow activity proxy defaults:

```typescript
const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '1s',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});
```

Notes:

- `scheduleToStartTimeout`, `scheduleToCloseTimeout`, and `heartbeatTimeout` are **not currently configured**.
- No per-step activity timeout overrides are implemented in current adapter.

Rationale and roadmap note:

- In v1.1, only `startToCloseTimeout` + retry policy are intentionally configured to keep policy surface minimal while interpreter semantics stabilize.
- `scheduleToStartTimeout`/`scheduleToCloseTimeout`/`heartbeatTimeout` and per-step timeout matrix are deferred to v1.2.

Safe-default recommendation for v1.2 rollout:

- Add a bounded `scheduleToCloseTimeout` (e.g., `'35m'`) to cap total elapsed time across retries and avoid unbounded retry extension.
- `scheduleToCloseTimeout` is currently unset (defaults to unlimited), so total wall-clock time is bounded only by retry settings plus worker/service behavior.

Timeout interaction note:

- Current defaults (`startToCloseTimeout='30m'`, `maximumAttempts=3`) permit up to ~90 minutes of attempt runtime budget in the worst case, plus queue/backoff overhead.
- v1.2 timeout matrix should explicitly confirm whether this ceiling aligns with product expectations for maximum step duration.

---

## 5) Eventing and Idempotency (IMPLEMENTED)

- Activities emit envelopes through `stateStore.appendEventsTx()` and forward appended events with `outbox.enqueueTx()`.
- `engineAttemptId` is sourced from Temporal activity context (`Context.current().info.attempt`) with test fallback to `1`.
- `logicalAttemptId` defaults to `engineAttemptId` when not supplied.
- Idempotency key is generated from event dimensions (`eventType`, tenant/run IDs, attempts, optional `stepId`) via injected idempotency builder.

### 5.1 Attempt semantics and event multiplicity

- `engineAttemptId` starts at `1` and increments on activity retries.
- Multiple attempt-level event pairs for the same `stepId` are expected in failure/retry paths (diagnostic value), e.g. repeated `StepStarted`/`StepFailed` across attempts.
- Idempotency still must dedupe duplicate delivery within the **same** attempt boundary (e.g., crash after persistence and before ack).
- Activities are designed under Temporal’s at-least-once execution assumption; side effects must remain idempotent.
- This follows Temporal guidance that activities should be idempotent in durable execution systems.

Concrete key-shape example (illustrative):

```text
idempotencyKey = hash(tenantId + runId + stepId + engineAttemptId + eventType)
```

### Important current behavior

Current implementation couples logical attempt fallback to engine attempt when caller does not provide a planner-level logical attempt. This is **implemented behavior**, not a target-state recommendation.

---

## 6) Determinism Constraints (IMPLEMENTED + GUARDRAILS)

In workflow code (`RunPlanWorkflow`), determinism guardrails are present by design:

- Avoid non-deterministic behavior and non-workflow-safe libraries; rely on Temporal workflow APIs. `Date` is deterministic in Temporal TypeScript workflow runtime, but we avoid it in workflow logic as a conservative house policy.
- Side effects are delegated to activities.
- Only Temporal workflow APIs are used for control flow (`defineSignal`, `defineQuery`, `condition`, `proxyActivities`).

Test-only non-deterministic helpers (e.g. polling with `Date.now()`) exist in integration tests and are outside workflow sandbox constraints.

For broader policy context, see [determinism-tooling.md](../../dev/determinism-tooling.md).

---

## 7) Worker and Client Lifecycle (IMPLEMENTED)

### 7.1 Worker host

- `TemporalWorkerHost.start(connection)` creates worker once and throws `TEMPORAL_WORKER_ALREADY_STARTED` on duplicate starts.
- Worker fields are configured from adapter config (`namespace`, `taskQueue`, optional `identity`).
- Workflow entry defaults to `RunPlanWorkflow` bundle unless `workflowsPath` override is provided.
- `shutdown()` drains and resets internal worker state.

### 7.2 Client manager

- Lazy-connect with connection de-dup (`connect()` memoizes in-flight promise).
- Exposes `isConnected()`, `ensureConnected()`, and `close()` lifecycle APIs.
- Adapter enforces client availability and throws `TEMPORAL_CLIENT_NOT_CONFIGURED` or `TEMPORAL_CLIENT_NOT_CONNECTED` in invalid states.

---

## 8) Config Policy (IMPLEMENTED)

Environment-backed config defaults:

- `address`: `127.0.0.1:7233`
- `namespace`: `default`
- `taskQueue`: `dvt-temporal`
- `connectTimeoutMs`: `5000`
- `requestTimeoutMs`: `10000`

Validation enforces non-empty `address` / `namespace` / `taskQueue`, optional non-empty `identity`, and positive integer timeouts.

---

## 9) Planned / Not Yet Implemented

The following were previously documented as normative but are **not implemented** in current code:

- Continue-as-new trigger and state compaction.
- Workflow history byte-size estimation and rotation thresholds.
- Signal payload size/rate enforcement inside adapter/workflow.
- Per-step activity timeout override matrix.
- Implemented runtime handling for `RETRY_STEP` / `RETRY_RUN`.

These should be treated as backlog policies until corresponding code lands in `packages/@dvt/adapter-temporal/src`.

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                           |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1     | 2026-02-14 | Rewritten to match real adapter implementation (`TemporalAdapter`, `RunPlanWorkflow`, activities, worker/client lifecycle). Removed unimplemented normative claims and fixed contract link path. |
| 1.0     | 2026-02-11 | Initial Temporal engine policies.                                                                                                                                                                |
