# Temporal Engine Policies

**Status**: Implementation Snapshot (aligned to current code)  
**Version**: 1.2  
**Engine**: Temporal  
**Contract**: [ExecutionSemantics.v1.md](../../contracts/engine/ExecutionSemantics.v1.md)

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

- `TemporalAdapter.getProviderStatusView()` now calls
  `WorkflowHandle.describe()` and returns a provider-native
  `ProviderRunStatusView`.
- The engine's canonical caller-visible status still remains the event-log plus
  snapshot read path governed outside the adapter boundary.
- Provider status should therefore be treated as live runtime enrichment, not
  as the authoritative state-store replacement.
- Missing `describe().status.name` still fails closed as an invalid provider
  response shape, but unknown future Temporal status tokens are preserved as
  provider diagnostics instead of breaking enriched reads.
- In native-cancel cleanup races, `describe()` may still report `RUNNING` while
  workflow-local terminal cancellation events are being persisted, but the
  workflow now rethrows native cancellation after non-cancellable terminal
  event finalization so Temporal eventually settles on provider status
  `CANCELLED`.
- Cooperative `signal(CANCEL)` remains a distinct workflow-owned path and may
  still end with provider token `COMPLETED` because it does not request
  provider-native workflow cancellation.
- Temporal workflow runtime still exposes an internal `runtimeState` query for workflow-local visibility/debugging, but it is no longer the adapter's published provider-status boundary.
- The provider view is intentionally narrower than the canonical read model:
  Temporal-native runtime statuses such as `RUNNING`, `FAILED`,
  `TERMINATED`, `TIMED_OUT`, and `CONTINUED_AS_NEW` come from the Temporal
  server, while DVT lifecycle concepts such as `PAUSED` and `CANCELLING`
  remain canonical-engine concepts only.

---

## 2) Signal and Cancellation Semantics (IMPLEMENTED)

### 2.1 Supported control surface

- Supported control requests in adapter:
  - `PAUSE` -> workflow signal `pause`
  - `RESUME` -> workflow signal `resume`
  - `CANCEL` -> workflow signal `cancel`
- Business run recovery is not part of `signal(...)`; a future recover-run use
  case must be governed separately by the engine/application boundary.
- `RETRY_STEP` is no longer part of the canonical signal path; any future step retry must use a dedicated use-case boundary.

### 2.2 Workflow handlers

Workflow defines and handles:

- `pause` signal
- `resume` signal
- `cancel` signal (with optional reason payload)
- internal `runtimeState` query

Current adapter policy splits cancellation into two governed paths:

- `cancelRun()` uses Temporal-native `WorkflowHandle.cancel()`
- `signal(CANCEL)` remains the cooperative reason-carrying path

The remaining open work is no longer the provider boundary itself; it is the
architecture and contract truth sync around who owns
`RunCancelRequested` / `RunCancelled` and how provider live status relates to
the canonical read model.

### 2.3 Cancellation reason semantics (CURRENT)

- Workflow defines a `cancel` signal with `reason` payload.
- `signal(CANCEL)` forwards that reason payload through the cooperative signal
  path.
- `cancelRun()` uses Temporal-native cancellation and therefore does not carry
  a structured reason payload.
- Therefore, `cancelReason` should be treated as **best-effort** and may be
  empty in runs cancelled through `cancelRun()`.
- In the TypeScript SDK, `WorkflowHandle.cancel()` has no reason parameter, so
  the native cancel path necessarily leaves `cancelReason` optional.

Consumer guidance for v1.1:

- Treat `cancelReason` as optional in all readers/projections.
- Apply fallback messaging when absent (for example: `Cancelled by system`).
- Emit diagnostic logs/metrics when a reason is expected by product flow but arrives empty.

Contract-pack reset tracked under `AR-A12-A`:

- normalize whether `RunCancelRequested` is governed as a runtime-owned
  lifecycle fact across ADR and contract surfaces
- clarify that provider live status is enrichment and not the authoritative
  caller-visible read model

---

## 3) Pause/Resume/Cancellation Flow (IMPLEMENTED)

- Workflow state tracks: `status`, `paused`, `cancelRequested`, `cancelReason`, `currentStepIndex`.
- Before each step, workflow checks cancellation and emits `RunCancelled` when applicable.
- Native Temporal cancellation is caught in workflow cleanup, which currently
  emits ordered cancellation lifecycle events from workflow context.
- The workflow currently flips in-memory status before terminal cancellation
  events are persisted, so ordered lifecycle truth still belongs to the
  event-log-backed read path rather than the live workflow query.
- Late native cancellation can still produce a transient mismatch while
  terminal cancellation events are being written, but native provider status
  now converges to `CANCELLED` after finalization. Cooperative
  `signal(CANCEL)` remains a separate path whose provider token may complete
  normally even though canonical status closes as cancelled.
- During pause, workflow blocks with `condition(() => !state.paused || state.cancelRequested)`.
- On pause/resume transitions, lifecycle events are emitted via activities (`RunPaused`, `RunResumed`).
- Step execution emits `StepStarted` and either `StepCompleted` or (`StepFailed` + `RunFailed`).

---

## 4) Activity Policy (IMPLEMENTED)

The workflow now resolves step-activity retry policy per executed step:

```typescript
function createStepActivities(step: WorkflowStep) {
  return proxyActivities<Pick<WorkflowActivitiesPort, 'executeStep'>>({
    startToCloseTimeout: '30m',
    cancellationType: ActivityCancellationType.TRY_CANCEL,
    retry: resolveStepActivityRetryPolicy(step),
  });
}
```

Resolved policy order:

1. `step.retryPolicy` from the canonical `ExecutionPlan`
2. governed default:

```typescript
{
  initialInterval: '1s',
  maximumInterval: '60s',
  backoffCoefficient: 2,
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['PermanentStepError'],
}
```

Notes:

- `scheduleToStartTimeout`, `scheduleToCloseTimeout`, and `heartbeatTimeout` are still **not currently configured**.
- No per-step timeout override matrix is implemented yet; only retry/backoff ownership moved into the plan contract.
- Retry metadata under `stepTypeConfig.retries` is no longer consumed for runtime activity retry policy. Only top-level `step.retryPolicy` affects Temporal retry mapping.

Timeout interaction note:

- Current defaults (`startToCloseTimeout='30m'`, governed default `maximumAttempts=3`) permit up to ~90 minutes of attempt runtime budget in the worst case, plus queue/backoff overhead.
- A future timeout-matrix slice should still decide whether `scheduleToCloseTimeout` needs a bounded cap across retries.

---

## 5) Eventing and Idempotency (IMPLEMENTED)

- Activities emit envelopes through `runStateCommandPort.appendTransitions()`, which resolves to the canonical `appendAndEnqueueTx()` path in the state-store implementation.
- `engineAttemptId` is sourced from Temporal activity context (`Context.current().info.attempt`) with test fallback to `1`.
- `logicalAttemptId` defaults to `1` when not supplied.
- Idempotency key is generated from event dimensions (`eventType`, tenant/run IDs, attempts, optional `stepId`) via injected idempotency builder.

### 5.1 Attempt semantics and event multiplicity

- `engineAttemptId` starts at `1` and increments on activity retries.
- Multiple attempt-level event pairs for the same `stepId` are expected in failure/retry paths (diagnostic value), e.g. repeated `StepStarted`/`StepFailed` across attempts.
- Idempotency still must dedupe duplicate delivery within the **same** attempt boundary (e.g., crash after persistence and before ack).
- Activities are designed under Temporalâ€™s at-least-once execution assumption; side effects must remain idempotent.
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
- Worker lifecycle emits structured logs, traces, counters, and duration histograms.
- Unexpected `worker.run()` failure is recorded explicitly instead of remaining an unobserved runtime exit.

### 7.2 Client manager

- Lazy-connect with connection de-dup (`connect()` memoizes in-flight promise).
- Exposes `isConnected()`, `ensureConnected()`, and `close()` lifecycle APIs.
- Adapter enforces client availability and throws `TEMPORAL_CLIENT_NOT_CONFIGURED` or `TEMPORAL_CLIENT_NOT_CONNECTED` in invalid states.
- `connectTimeoutMs` actively bounds `Connection.connect()` through the SDK-native connect deadline.
- `requestTimeoutMs` actively bounds `ensureConnected()` health checks and `lookupRunRef()` probes through abortable RPC cancellation when the SDK workflow client is in use.

### 7.3 Operational diagnostics

- `lookupRunRef()` emits `found`, `missing`, and `error` results through observability.
- `ping()` emits duration and success/failure diagnostics.
- Runtime diagnostics now use the shared `@dvt/observability` port instead of ad-hoc silent failure paths.

### 7.4 Closure Evidence and Navigation

- Runtime closure verification command:
  `pnpm test:adapter-temporal`,
  and `pnpm test:adapter-temporal:integration`
- Capability-specific verification command:
  `pnpm test:adapter-temporal:integration:transformation` when transformation
  runtime semantics are in scope
- PostgreSQL object-file behavior is verified by the worker object-file profile
  tests and the PR quality `PostgreSQL adapters and object-file integration` job.
- Local PostgreSQL lifecycle: `pnpm postgres:local:reset` and
  `pnpm postgres:local:down`.
- Canonical runbook:
  [Temporal Postgres Proof Environment](../../../../../runbooks/temporal-postgres-proof-environment.md)
- Evidence:
  [ED-20260308 - Temporal adapter operational close-out](../../../../../evidence/critical/ED-20260308-temporal-operational-close-out.md)
- Residual risk:
  [R-20260308 - Temporal runtime hardening residuals](../../../../../risk-register/adapters/R-20260308-temporal-operational-hardening-residuals.md)
- Test capability guide:
  [Testing and CI Capabilities](../../../../../guides/testing-and-ci-capabilities.md)

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

These should be treated as backlog policies until corresponding code lands in `packages/@dvt/adapter-temporal/src`.

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                           |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.2     | 2026-03-08 | Documented client timeout enforcement and runtime observability for Temporal client, worker host, `lookupRunRef()`, and `ping()`.                                                                |
| 1.1     | 2026-02-14 | Rewritten to match real adapter implementation (`TemporalAdapter`, `RunPlanWorkflow`, activities, worker/client lifecycle). Removed unimplemented normative claims and fixed contract link path. |
| 1.0     | 2026-02-11 | Initial Temporal engine policies.                                                                                                                                                                |
