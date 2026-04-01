---
title: G4-PR4: Admission Control Operability â€” Implementation Plan
status: Draft
owner: docs
last_reviewed: 2026-04-01
planning_type: proposal
---

---

title: G4-PR4 Operability & Metrics â€” Implementation Plan
status: Ready to implement
owner: Architecture / API
last_reviewed: 2026-04-01
planning_type: proposal

---

# G4-PR4: Admission Control Operability â€” Implementation Plan

## Diagnosis

`BackpressureAwareStartRunUseCase` already calls `telemetry.recordDecision()` on every
admission outcome â€” accept, duplicate, reject_tenant, reject_system, would_reject_tenant,
would_reject_system. The **sole gap** is that `NoopAdmissionTelemetry` silently discards
every call.

Two secondary gaps:

1. The `AdmissionTelemetry` port uses an optional-field bag, breaking ISP and making
   exhaustive handling impossible.
2. Capacity gauges (queue depth, outbox lag) are not emitted â€” `RawSqlBackpressureStore`
   has the data but no observer is wired.

---

## Hexagonal Architecture â€” Target State

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Application Layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                                           â”‚
â”‚  PORT: AdmissionTelemetry             PORT: IBackpressureCapacityTelemetryâ”‚
â”‚  record(AdmissionDecisionRecord)      recordSnapshot(input)               â”‚
â”‚                                                                           â”‚
â”‚  BackpressureAwareStartRunUseCase                                         â”‚
â”‚    â”œâ”€â”€ deps.telemetry: AdmissionTelemetry          (decision events)      â”‚
â”‚    â””â”€â”€ deps.admissionGuard: AdmissionGuard                                â”‚
â”‚                                                                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â†‘ implements                   â†‘ implements
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Infrastructure Layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                                          â”‚
â”‚  ObservabilityAdmissionTelemetry      ObservabilityBackpressureCapacity  â”‚
â”‚  (NEW â€” replaces Noop)                Telemetry (NEW)                    â”‚
â”‚                    â†“ uses                         â†“ uses                 â”‚
â”‚                    IObservability                 IObservability          â”‚
â”‚                                                                          â”‚
â”‚  MetricsEmittingBackpressureStore  (NEW â€” Decorator pattern)             â”‚
â”‚    wraps: BackpressureSnapshotEnvelopeStore                              â”‚
â”‚    exposes: BackpressureStore                                            â”‚
â”‚    calls: IBackpressureCapacityTelemetry.recordSnapshot() on each read  â”‚
â”‚                                                                          â”‚
â”‚  Store chain:                                                            â”‚
â”‚    RawSqlBackpressureStore                                               â”‚
â”‚      â†’ CircuitBreakingBackpressureStore                                  â”‚
â”‚        â†’ CachedBackpressureStore                                         â”‚
â”‚          â†’ MetricsEmittingBackpressureStore  â† NEW position             â”‚
â”‚              â†’ StartRunAdmissionGuard                                    â”‚
â”‚                                                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## SOLID Analysis

| Principle                       | Current violation                                                            | Resolution                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **S** â€” Single Responsibility | `AdmissionTelemetry` mixes decision recording with capacity reporting        | Split into two ports                                                                 |
| **O** â€” Open/Closed           | Decision variants require modifying the bag struct                           | Discriminated union: extend by adding a variant, not modifying existing              |
| **I** â€” Interface Segregation | One port with 4 optional fields used by different call sites                 | Two ports, each with exactly the fields its callers need                             |
| **D** â€” Dependency Inversion  | `buildProtectedRuntimeModule` depends on `NoopAdmissionTelemetry` (concrete) | Depend on `AdmissionTelemetry` port; inject the real adapter at the composition root |

---

## Ports

### 1 â€” Refine `AdmissionTelemetry` (existing port â€” breaking change on signature)

**File:** `apps/api/src/application/ports/AdmissionTelemetry.ts`

Replace the optional-field bag with a typed discriminated union. The method is renamed
`record` (from `recordDecision`) to match Fowler's command-verb naming.

```ts
type CommonFields = {
  readonly requestId: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly mode: AdmissionMode;
};

export type AdmissionDecisionRecord =
  | (CommonFields & {
      readonly decision: typeof ADMISSION_TELEMETRY_DECISION.accept;
    })
  | (CommonFields & {
      readonly decision: typeof ADMISSION_TELEMETRY_DECISION.duplicate;
      readonly duplicateOf: DuplicateOf;
    })
  | (CommonFields & {
      readonly decision:
        | typeof ADMISSION_TELEMETRY_DECISION.rejectTenant
        | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectTenant;
      readonly code: typeof START_RUN_BACKPRESSURE_CODE.tenant;
      readonly retryAfterSeconds: number;
    })
  | (CommonFields & {
      readonly decision:
        | typeof ADMISSION_TELEMETRY_DECISION.rejectSystem
        | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectSystem;
      readonly code:
        | typeof START_RUN_BACKPRESSURE_CODE.system
        | typeof START_RUN_BACKPRESSURE_CODE.snapshotUnavailable;
      readonly retryAfterSeconds: number;
    });

export interface AdmissionTelemetry {
  record(event: AdmissionDecisionRecord): Promise<void>;
}
```

**Why discriminated union:** TypeScript exhaustive switch in adapters guarantees
compile-time coverage of every variant. Adding a new decision kind is an O/C extension
(add a union member + handle in adapter) not a modification.

### 2 â€” New port: `IBackpressureCapacityTelemetry` (ISP split)

**File:** `apps/api/src/application/ports/IBackpressureCapacityTelemetry.ts`

```ts
export interface BackpressureCapacitySnapshot {
  readonly tenantId: string;
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: 'live' | 'cache' | 'fallback';
}

export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void; // sync, fire-and-forget
}
```

Sync (not async) by design: metric emission must never delay the request path. Errors
are swallowed internally. This is not a command â€” it is an observation.

---

## Infrastructure Adapters (new files)

### 3 â€” `admissionTelemetryMetrics.ts`

**File:** `apps/api/src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.ts`

Metric name constants, following the `dvt.{domain}.{noun}_{verb}` convention:

```ts
export const ADMISSION_TELEMETRY_METRICS = Object.freeze({
  decisionTotal: 'dvt.admission.decision_total',
  rejectionTotal: 'dvt.admission.rejection_total',
  pendingEventsGauge: 'dvt.admission.pending_events_per_tenant',
  outboxOldestAgeGauge: 'dvt.admission.outbox_oldest_age_ms',
} as const);
```

Labels used (all low-cardinality bounded enums):

- `dvt.admission.decision_total` â†’ `{ mode, decision }`
- `dvt.admission.rejection_total` â†’ `{ mode, decision, code }`
- `dvt.admission.pending_events_per_tenant` â†’ `{ source }` (no `tenantId` â€” high-cardinality)
- `dvt.admission.outbox_oldest_age_ms` â†’ `{ source }`

### 4 â€” `ObservabilityAdmissionTelemetry.ts`

**File:** `apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.ts`

Implements `AdmissionTelemetry`. Depends on `IObservability`.

Behaviour per variant:

| `decision`            | counter                           | log level | extra counter                            |
| --------------------- | --------------------------------- | --------- | ---------------------------------------- |
| `accept`              | `decision_total {mode, decision}` | `info`    | â€”                                      |
| `duplicate`           | `decision_total {mode, decision}` | `info`    | â€”                                      |
| `reject_tenant`       | `decision_total {mode, decision}` | `warn`    | `rejection_total {mode, decision, code}` |
| `reject_system`       | `decision_total {mode, decision}` | `warn`    | `rejection_total {mode, decision, code}` |
| `would_reject_tenant` | `decision_total {mode, decision}` | `warn`    | `rejection_total {mode, decision, code}` |
| `would_reject_system` | `decision_total {mode, decision}` | `warn`    | `rejection_total {mode, decision, code}` |

The `record()` implementation uses an exhaustive switch over `event.decision`. TypeScript
will produce a compile error if a new variant is added to `AdmissionDecisionRecord` but not
handled here â€” this is the OCP compliance guarantee.

Log attributes (info/warn only â€” no high-cardinality in metric labels):

```ts
{
  msg: 'admission.decision',
  attributes: {
    requestId: event.requestId,
    tenantId: event.tenantId,
    runId: event.runId,
    mode: event.mode,
    decision: event.decision,
    code?: event.code,
    retryAfterSeconds?: event.retryAfterSeconds,
    duplicateOf?: event.duplicateOf,
  }
}
```

### 5 â€” `ObservabilityBackpressureCapacityTelemetry.ts`

**File:** `apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.ts`

Implements `IBackpressureCapacityTelemetry`. Depends on `IObservability`.

```ts
recordSnapshot(snapshot: BackpressureCapacitySnapshot): void {
  const labels = { source: snapshot.source };
  this.pendingGauge.set(snapshot.pendingEventsCount, labels);
  this.outboxAgeGauge.set(snapshot.outboxOldestAgeMs, labels);
}
```

Gauges are pre-built in the constructor to avoid recreating metric instruments on every
snapshot read.

### 6 â€” `MetricsEmittingBackpressureStore.ts`

**File:** `apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.ts`

Decorator that wraps `BackpressureSnapshotEnvelopeStore` and exposes `BackpressureStore`.
Calls `IBackpressureCapacityTelemetry.recordSnapshot()` on each snapshot read, then returns
only the snapshot to the guard. Telemetry errors are caught and swallowed.

```ts
export class MetricsEmittingBackpressureStore implements BackpressureStore {
  public constructor(
    private readonly deps: {
      readonly delegate: BackpressureSnapshotEnvelopeStore;
      readonly capacityTelemetry: IBackpressureCapacityTelemetry;
    }
  ) {}

  public async getTenantSnapshot(tenantId: string): Promise<BackpressureSnapshot> {
    const envelope = await this.deps.delegate.getTenantSnapshotEnvelope(tenantId);
    try {
      this.deps.capacityTelemetry.recordSnapshot({
        tenantId,
        pendingEventsCount: envelope.snapshot.pendingEventsPerTenant,
        outboxOldestAgeMs: envelope.snapshot.outboxOldestAgeMs,
        source: envelope.source,
      });
    } catch {
      // Telemetry must not break admission.
    }
    return envelope.snapshot;
  }
}
```

---

## Files to Modify

### 7 â€” Update `BackpressureAwareStartRunUseCase`

`recordDecision` â†’ `record`, all call sites updated to pass the typed variant.
No logic change â€” only the call signature adapts to the new port.

### 8 â€” Update `NoopAdmissionTelemetry`

Method renamed `record`, parameter typed as `AdmissionDecisionRecord`. Still a noop.
Kept as the Null Object for test doubles and `ADMISSION_MODE.off` contexts.

### 9 â€” Update `buildProtectedRuntimeModule.ts`

```ts
// Before (line 188)
telemetry: new NoopAdmissionTelemetry(),

// After
const capacityTelemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });
const instrumentedStore = new MetricsEmittingBackpressureStore({
  delegate: cachedStore,
  capacityTelemetry,
});
// admissionGuard now receives instrumentedStore instead of cachedStore
const admissionGuard = new StartRunAdmissionGuard({
  backpressureStore: instrumentedStore,
  policy,
});
// ...
telemetry: new ObservabilityAdmissionTelemetry({ observability }),
```

---

## TDD Test List

Tests are written before implementation. Each test maps to a red â†’ green â†’ refactor cycle.

### `ObservabilityAdmissionTelemetry.test.ts`

| #   | Test name                                                             | Asserts                                                                               |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `records decision_total counter for accept`                           | `counter('dvt.admission.decision_total').add(1, {mode:'enforce', decision:'accept'})` |
| 2   | `logs info for accept decision`                                       | `logs.info` called with `msg: 'admission.decision'` and `decision: 'accept'`          |
| 3   | `records decision_total counter for duplicate`                        | same counter, `decision: 'duplicate'`                                                 |
| 4   | `records decision_total and rejection_total for reject_tenant`        | both counters, `code: 'TENANT_BACKPRESSURE'`                                          |
| 5   | `logs warn for reject_tenant`                                         | `logs.warn` called                                                                    |
| 6   | `records decision_total and rejection_total for reject_system`        | both counters, `code: 'SYSTEM_BACKPRESSURE'`                                          |
| 7   | `records rejection_total with code=BACKPRESSURE_SNAPSHOT_UNAVAILABLE` | `code` in counter labels                                                              |
| 8   | `records would_reject_tenant in observe mode`                         | `decision: 'would_reject_tenant'`, `mode: 'observe'`                                  |
| 9   | `records would_reject_system in observe mode`                         | `decision: 'would_reject_system'`, `mode: 'observe'`                                  |
| 10  | `does not include tenantId or runId in metric labels`                 | counter labels keys are `['mode','decision']` only                                    |
| 11  | `does not include tenantId or runId in rejection metric labels`       | counter labels keys are `['mode','decision','code']` only                             |
| 12  | `swallows internal errors â€” must not throw`                         | observability spy throws â†’ `record()` resolves without throwing                     |

### `ObservabilityBackpressureCapacityTelemetry.test.ts`

| #   | Test name                                               | Asserts                                                                    |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `sets pending_events gauge on live snapshot`            | `gauge('dvt.admission.pending_events_per_tenant').set(N, {source:'live'})` |
| 2   | `sets outbox_oldest_age gauge on live snapshot`         | gauge set with `outboxOldestAgeMs` value                                   |
| 3   | `uses source=cache label when snapshot source is cache` | gauge label `{source:'cache'}`                                             |
| 4   | `uses source=fallback label for fallback snapshot`      | gauge label `{source:'fallback'}`                                          |

### `MetricsEmittingBackpressureStore.test.ts`

| #   | Test name                                                   | Asserts                                    |
| --- | ----------------------------------------------------------- | ------------------------------------------ |
| 1   | `returns snapshot from delegate`                            | resolved value is `envelope.snapshot`      |
| 2   | `calls capacityTelemetry.recordSnapshot with envelope data` | telemetry spy called with correct fields   |
| 3   | `passes tenantId to recordSnapshot`                         | `tenantId` in telemetry call               |
| 4   | `passes source field from envelope`                         | `source: 'cache'` propagated               |
| 5   | `swallows telemetry errors â€” snapshot still returned`     | telemetry spy throws â†’ snapshot resolves |
| 6   | `propagates delegate errors`                                | delegate throws â†’ store throws           |

---

## Microcommit Sequence

All commits follow Conventional Commits. Each commit passes `pnpm verify:prepush`.

```
C1  refactor(admission-port): replace optional-field bag with AdmissionDecisionRecord union
    - AdmissionTelemetry.ts: recordDecision â†’ record, input â†’ AdmissionDecisionRecord
    - NoopAdmissionTelemetry.ts: adapt to new signature (still noop)
    - BackpressureAwareStartRunUseCase.ts: build typed variant at each call site

C2  feat(admission-port): add IBackpressureCapacityTelemetry port (ISP split)
    - New: apps/api/src/application/ports/IBackpressureCapacityTelemetry.ts

C3  feat(admission): add admission telemetry metric name constants
    - New: apps/api/src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.ts

C4  test(admission): add failing unit tests for ObservabilityAdmissionTelemetry
    - New: apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts
    - All 12 tests red

C5  feat(admission): implement ObservabilityAdmissionTelemetry
    - New: apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.ts
    - All 12 tests green

C6  test(admission): add failing unit tests for ObservabilityBackpressureCapacityTelemetry
    - New: apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.test.ts

C7  feat(admission): implement ObservabilityBackpressureCapacityTelemetry
    - New: apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.ts

C8  test(admission): add failing unit tests for MetricsEmittingBackpressureStore
    - New: apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.test.ts

C9  feat(admission): implement MetricsEmittingBackpressureStore decorator
    - New: apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.ts

C10 wire(admission): replace NoopAdmissionTelemetry, add MetricsEmittingBackpressureStore
    - Modify: apps/api/src/modules/buildProtectedRuntimeModule.ts
    - Remove import: NoopAdmissionTelemetry
    - Add imports: ObservabilityAdmissionTelemetry, ObservabilityBackpressureCapacityTelemetry,
                   MetricsEmittingBackpressureStore

C11 docs(admission): add admission control runbook
    - New: docs/runbooks/admission-control-runbook.md

C12 docs(admission): add emergency stuck-event cleanup SQL
    - New: docs/runbooks/admission-control-emergency-cleanup.sql
```

---

## New Files Summary

| File                                                                                                | Type          | Layer          |
| --------------------------------------------------------------------------------------------------- | ------------- | -------------- |
| `apps/api/src/application/ports/IBackpressureCapacityTelemetry.ts`                                  | Port (new)    | Application    |
| `apps/api/src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.ts`                       | Constants     | Infrastructure |
| `apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.ts`                 | Adapter (new) | Infrastructure |
| `apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts`            | Test          | Infrastructure |
| `apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.ts`      | Adapter (new) | Infrastructure |
| `apps/api/src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.test.ts` | Test          | Infrastructure |
| `apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.ts`                      | Adapter (new) | Infrastructure |
| `apps/api/src/infrastructure/backpressure/MetricsEmittingBackpressureStore.test.ts`                 | Test          | Infrastructure |
| `docs/runbooks/admission-control-runbook.md`                                                        | Runbook       | Docs           |
| `docs/runbooks/admission-control-emergency-cleanup.sql`                                             | Script        | Docs           |

## Modified Files Summary

| File                                                                    | Change                                     |
| ----------------------------------------------------------------------- | ------------------------------------------ |
| `apps/api/src/application/ports/AdmissionTelemetry.ts`                  | Port refined â€” discriminated union       |
| `apps/api/src/application/services/NoopAdmissionTelemetry.ts`           | Signature update only                      |
| `apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts` | Call sites updated to typed variants       |
| `apps/api/src/modules/buildProtectedRuntimeModule.ts`                   | Replace noop, wire metrics store decorator |

---

## PR4 Checklist Mapping

| Checklist item                                        | Commit | How                                                                                            |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| observe mode emits same decision telemetry as enforce | C1, C5 | `would_reject_*` variants in discriminated union, handled in `ObservabilityAdmissionTelemetry` |
| tenant and system reject metrics exist                | C5     | `rejection_total {decision, code}` counter                                                     |
| throughput metrics start being collected              | C5     | `decision_total` counter on every call including accepts                                       |
| stuck backlog metrics and alerts exist                | C7, C9 | `outbox_oldest_age_ms` gauge â€” high value = stuck; `pending_events_per_tenant` gauge         |
| rollout guide covers off/observe/enforce              | C11    | Runbook                                                                                        |
| tuning guide includes threshold derivation            | C11    | Runbook section                                                                                |
| emergency cleanup or quarantine script exists         | C12    | SQL script                                                                                     |
| chaos scenarios enumerated                            | C11    | Runbook section                                                                                |

---

## Deferred to PR5

- `stuckPendingEventsPerTenant` gauge requires adding a field to `BackpressureSnapshot`
  in `@dvt/delivery` and propagating through `RawSqlBackpressureStore`. The current
  `outboxOldestAgeMs` gauge already signals stuck state for alerting purposes.
- Dynamic `Retry-After` per-tenant
- Projected snapshot table

---

## Progress Tracker

- [ ] C1 â€” refactor port: AdmissionDecisionRecord discriminated union
- [ ] C2 â€” new port: IBackpressureCapacityTelemetry
- [ ] C3 â€” metric constants
- [ ] C4 â€” failing tests: ObservabilityAdmissionTelemetry
- [ ] C5 â€” impl: ObservabilityAdmissionTelemetry (tests green)
- [ ] C6 â€” failing tests: ObservabilityBackpressureCapacityTelemetry
- [ ] C7 â€” impl: ObservabilityBackpressureCapacityTelemetry
- [ ] C8 â€” failing tests: MetricsEmittingBackpressureStore
- [ ] C9 â€” impl: MetricsEmittingBackpressureStore
- [ ] C10 â€” wire composition root
- [ ] C11 â€” runbook
- [ ] C12 â€” emergency cleanup SQL
