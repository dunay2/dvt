# ADR-0030 — Pre-Dispatch Intent Log for startRun Crash Consistency

- Status: Accepted
- Date: 2026-03-03
- Owners: Engine Domain
- Related files:
  - [IStartRunIntentStore.ts](../../packages/@dvt/engine/src/ports/IStartRunIntentStore.ts) (new)
  - [InMemoryStartRunIntentStore.ts](../../packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts) (new)
  - [intentErrors.ts](../../packages/@dvt/engine/src/contracts/intentErrors.ts) (new)
  - [WorkflowEngine.ts](../../packages/@dvt/engine/src/core/WorkflowEngine.ts) (modified)
  - [RunMaintenanceService.ts](../../packages/@dvt/engine/src/services/RunMaintenanceService.ts) (modified)
  - [IRunMaintenanceService.ts](../../packages/@dvt/engine/src/ports/IRunMaintenanceService.ts) (modified)
  - [ADR-0003 — Execution Model](ADR-0003-execution-model.md)
  - [ADR-0013 — bootstrapRunTx Atomicity](ADR-0013-run-state-store-bootstrapRunTx.md)
  - [ADR-0014 — Adapter-First Execution](ADR-0014-run-driven-adapter-model.md)
  - [ADR-0029 — Run Maintenance Service Extraction](ADR-0029-run-maintenance-service.md)

---

## 1. Context

### 1.1 The distributed consistency gap in startRun()

`WorkflowEngine.startRun()` follows the adapter-first execution model (ADR-0014): the provider workflow is created via `adapter.startRun()` **before** the engine persists run metadata via `stateStore.bootstrapRunTx()`. This ordering is intentional — it ensures that provider references (`engineRunRef`) are available for atomic bootstrap (ADR-0013), eliminating a two-phase write gap.

However, this creates a crash-consistency window:

```
1.  validateStartRunPreconditions()        ← pure validation
2.  adapter.startRun() → engineRunRef      ← side effect: provider workflow exists
    ┌─── CRASH WINDOW ───────────────────────────────────────┐
    │ Process crash here → orphaned provider workflow         │
    │ DVT+ has no record of the workflow                      │
    │ Compensation (cancelRun) never fires                    │
    └────────────────────────────────────────────────────────┘
3.  stateStore.bootstrapRunTx()            ← atomically persist run
4.  On bootstrap failure: adapter.cancelRun()  ← compensation
```

The existing compensation logic (step 4) only handles exceptions during bootstrap. It does not protect against process death, OOM kills, or node failures between steps 2 and 3.

### 1.2 Why existing mechanisms are insufficient

| Mechanism                   | Handles exceptions | Handles process crash      | Detects orphaned workflows |
| --------------------------- | ------------------ | -------------------------- | -------------------------- |
| `try/catch` compensation    | Yes                | No                         | No                         |
| Adapter-level timeouts      | N/A                | Partial (provider may TTL) | No                         |
| Manual ops review           | N/A                | N/A                        | Ad-hoc, not systematic     |
| **Pre-dispatch intent log** | Yes                | **Yes**                    | **Yes**                    |

Without an intent log, a crash between `adapter.startRun()` and `bootstrapRunTx()` leaves a provider workflow (e.g., a Temporal workflow) running indefinitely with no DVT+ record to track, cancel, or reconcile it.

---

## 2. Alternatives Considered

### Option A: Reverse call order (bootstrap first, then adapter)

Persist run metadata before calling `adapter.startRun()`. If the adapter call fails, roll back the bootstrap.

**Rationale for rejection**: Violates ADR-0014 (adapter-first). The `engineRunRef` would not be available at bootstrap time, requiring a two-phase write (bootstrap without refs, then update with refs). This reintroduces the gap that ADR-0013 explicitly closes. Additionally, rolling back a committed `bootstrapRunTx` is not supported — the event store is append-only.

### Option B: Write-ahead log in IRunStateStore

Add intent tracking as a column or table within the event store itself.

**Rationale for rejection**: The event store (`IRunStateStore`) is scoped to run lifecycle persistence (events, metadata, projections). Intent tracking has a fundamentally different lifecycle: intents are short-lived, transient records that exist only during the `startRun()` call window. Mixing these concerns in the same store violates separation of concerns (ADR-0003) and complicates the state store contract.

### Option C: Adapter-level idempotency only

Rely on the adapter's workflowId derivation from runId (StartRunIdempotency spec §3.3) to deduplicate on retry. Accept the orphaned workflow as harmless.

**Rationale for rejection**: While workflowId derivation provides dedup on retry, it does not solve the actual orphan — the provider workflow continues running, consuming resources and potentially producing side effects. Without a record in DVT+, there is no way to cancel, monitor, or reconcile it. This is unacceptable for production systems.

### Option D: Separate pre-dispatch intent store (selected)

Create a dedicated `IStartRunIntentStore` port. Persist an intent record in PENDING status **before** `adapter.startRun()`. Transition through DISPATCHED to RESOLVED on the happy path. A reconciliation job in `RunMaintenanceService` periodically scans for orphaned intents and cancels the associated provider workflows.

**Why this option**:

- Covers both exception and process-crash scenarios.
- Maintains adapter-first ordering (ADR-0014) and atomic bootstrap (ADR-0013).
- Clean separation: intent tracking is orthogonal to event-sourced run state.
- Reconciliation is automated, idempotent, and observable.
- Required dependency ensures no deployment can skip the consistency guarantee.

---

## 3. Decision

### 3.1 New port: `IStartRunIntentStore`

A new port interface at `engine/src/ports/IStartRunIntentStore.ts`:

```typescript
type StartRunIntentStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'EXPIRED';

interface StartRunIntent {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  status: StartRunIntentStatus;
  engineRunRef?: EngineRunRef; // set after adapter.startRun() returns
  createdAt: string;
  updatedAt: string;
}

interface IStartRunIntentStore {
  createIntent(input: CreateIntentInput): Promise<StartRunIntent>;
  markDispatched(intentId: string, engineRunRef: EngineRunRef): Promise<void>;
  markResolved(intentId: string): Promise<void>;
  markExpired(intentId: string): Promise<void>;
  listOrphaned(thresholdMs: number, nowMs: number, limit?: number): Promise<StartRunIntent[]>;
  getIntent(intentId: string): Promise<StartRunIntent | null>;
}
```

Intent lifecycle state machine:

```
PENDING ──adapter.startRun()──▶ DISPATCHED ──bootstrapRunTx()──▶ RESOLVED
    │                               │
    └── reconcile (expire) ──▶ EXPIRED
                                    └── reconcile (cancel) ──▶ RESOLVED
```

Valid transitions:

- `PENDING → DISPATCHED` — after `adapter.startRun()` returns successfully
- `PENDING → EXPIRED` — reconciliation: no provider workflow was created
- `DISPATCHED → RESOLVED` — after `bootstrapRunTx()` succeeds, or reconciliation resolves
- `PENDING → RESOLVED` — after compensation (bootstrap failure on `PENDING` is possible if `markDispatched` was skipped)

All other transitions throw `IntentInvalidTransitionError`.

### 3.2 Modified `startRun()` flow

The `WorkflowEngine.startRun()` method now includes three intent store calls:

```
1.  validateStartRunPreconditions()            (existing)
2.  checkOutboxRateLimit()                     (existing)
3.  getAdapterOrThrow() + validateCapabilities (existing)
4.  intentStore.createIntent()                 [NEW] status=PENDING
5.  adapter.startRun() → runRef               (existing)
6.  intentStore.markDispatched(intentId, runRef)[NEW] status=DISPATCHED
7.  bootstrapRunTx()                           (existing)
8.  intentStore.markResolved(intentId)         [NEW] status=RESOLVED
    On bootstrap failure:
      adapter.cancelRun()                      (existing compensation)
      intentStore.markResolved() best-effort   [NEW]
```

Key implementation details:

- `createIntent` is called **before** any adapter interaction (step 4).
- `markResolved` after success and after compensation both use `.catch(() => {})` — best-effort. If the intent store call fails, the reconciliation job will clean it up on the next sweep.
- The `intentId` is generated from `idempotency.eventId()` — a fresh UUID per call. The intent store's `createIntent` is idempotent on `intentId`.

### 3.3 Crash scenario coverage

| Crash Point           | Intent Status | Reconciliation Action                                                                              |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Between steps 4 and 5 | PENDING       | Expire (no workflow exists)                                                                        |
| Between steps 5 and 6 | PENDING       | Expire (orphaned workflow relies on workflowId⟵runId dedup on retry, per StartRunIdempotency §3.3) |
| Between steps 6 and 7 | DISPATCHED    | Cancel workflow via stored `engineRunRef`                                                          |
| Between steps 7 and 8 | DISPATCHED    | Reconciler checks `stateStore.getRunMetadataByRunId()` — run exists → `markResolved()` (no cancel) |

### 3.4 Reconciliation via `RunMaintenanceService`

A new method `reconcileOrphanedIntents()` is added to `IRunMaintenanceService` (extending ADR-0029):

```typescript
interface ReconcileOrphanedIntentsOptions {
  thresholdMs: number;
  limit?: number;
  dryRun?: boolean;
}

interface ReconcileOrphanedIntentsResult {
  inspected: number;
  expired: string[]; // PENDING intents expired
  resolved: string[]; // DISPATCHED intents resolved after bootstrap was already persisted
  cancelled: string[]; // DISPATCHED intents cancelled after orphaned workflow cleanup
  cancelFailed: string[]; // cancellation failed, retry next sweep
}
```

Reconciliation logic:

1. `intentStore.listOrphaned(thresholdMs, nowMs, limit)` — find PENDING + DISPATCHED intents older than threshold, ordered by `createdAt` ASC.
2. For each PENDING intent: `markExpired()` — no provider workflow to cancel.
3. For each DISPATCHED intent:
   - Check `stateStore.getRunMetadataByRunId()` — if run exists, `markResolved()`. This handles the crash-between-bootstrap-and-markResolved scenario without issuing a spurious cancel.
   - If run does not exist: `adapter.cancelRun(intent.engineRunRef)`, then `markResolved()`.
   - If cancel fails (adapter unavailable, network error): report in `cancelFailed[]` for retry on next sweep.

### 3.5 Error types

Two new error classes extending `DvtError`:

- `IntentNotFoundError` (`code: 'INTENT_NOT_FOUND'`) — thrown when an operation references a non-existent intent.
- `IntentInvalidTransitionError` (`code: 'INTENT_INVALID_TRANSITION'`) — thrown on illegal state transitions (e.g., `RESOLVED → PENDING`).

### 3.6 Dependency requirements

`intentStore` is a **required** dependency on `WorkflowEngineDeps`. The engine's `validateDependencies()` method rejects construction if `intentStore` is not provided. This ensures that no deployment can skip the crash-consistency guarantee.

`RunMaintenanceServiceDeps` is extended with `intentStore` and `adapters` (the adapter map) to support reconciliation.

---

## 4. Consequences

### Positive

- **Closes the crash-consistency gap**: orphaned provider workflows are detected and cancelled automatically.
- **Reconciliation is automated and idempotent**: the sweep can run repeatedly without side effects on already-resolved intents.
- **Required dependency**: ensures the consistency guarantee cannot be accidentally omitted.
- **Observable**: metrics (`dvt.intent.expired_total`, `dvt.intent.cancelled_total`) and structured logs provide operational visibility into orphan detection and cleanup.
- **Extends the existing `RunMaintenanceService`** (ADR-0029) pattern: no new service class needed.

### Negative / Trade-offs

- **Additional dependency and port**: one more interface to implement for production (e.g., a Postgres-backed intent store).
- **PENDING crash gap**: a crash between `adapter.startRun()` return and `markDispatched()` leaves the intent in PENDING (not DISPATCHED), so the reconciler cannot use `engineRunRef` to cancel. Mitigated by workflowId derivation from runId (StartRunIdempotency spec §3.3), which enables natural dedup on retry.
- **Threshold tuning**: the reconciliation threshold must be set above the maximum expected `adapter.startRun()` latency to avoid false positives on slow responses.

### Out of scope

- **Production intent store implementation** (Postgres, DynamoDB, etc.) — only the in-memory implementation for tests is provided.
- **Periodic scheduler / cron** for invoking `reconcileOrphanedIntents()` — the scheduler is a separate infrastructure concern.
- **Multi-region reconciliation** — single-region assumption for now.

---

## 5. Verification Invariants

- **INV-INTENT-001**: `createIntent()` MUST be called **before** `adapter.startRun()` in the `startRun()` flow.
- **INV-INTENT-002**: `markDispatched()` MUST be called immediately after `adapter.startRun()` returns, attaching the `engineRunRef`.
- **INV-INTENT-003**: `markResolved()` MUST be called after `bootstrapRunTx()` succeeds.
- **INV-INTENT-004**: `markResolved()` on the compensation path is best-effort (`.catch(() => {})`).
- **INV-INTENT-005**: `intentStore` is a required dependency — `WorkflowEngine` MUST reject construction without it.
- **INV-INTENT-006**: The happy path transitions are `PENDING → DISPATCHED → RESOLVED`.
- **INV-INTENT-007**: Reconciliation expires PENDING intents beyond the threshold via `markExpired()`.
- **INV-INTENT-008**: Reconciliation checks `stateStore.getRunMetadataByRunId()` before cancelling a DISPATCHED intent — if the run exists, it marks the intent resolved without cancelling.
- **INV-INTENT-009**: `listOrphaned()` returns only PENDING and DISPATCHED intents older than the threshold, ordered by `createdAt` ASC.
- **INV-INTENT-010**: Failed cancellations are reported in `cancelFailed[]` for retry on the next sweep.
- **INV-INTENT-011**: Callers of `createIntent()` MUST derive `intentId` deterministically from `(tenantId, runId)` — e.g., `canonicalHash(tenantId | runId | "startRun")` following the ADR-0008 pattern — so that a scheduler crash-restart produces the same `intentId` and the idempotency-on-`intentId` guarantee absorbs the retry. Generating a fresh UUID on every invocation violates this invariant. Implementations MUST throw `IntentActiveConflictError` if a different `intentId` is submitted for a `(tenantId, runId)` pair that already has an active (PENDING or DISPATCHED) intent.

---

## 6. References

- [ADR-0003 — Execution Model Sovereignty](ADR-0003-execution-model.md) — Engine domain boundary
- [ADR-0013 — bootstrapRunTx Atomicity](ADR-0013-run-state-store-bootstrapRunTx.md) — Provider refs in atomic bootstrap
- [ADR-0014 — Adapter-First Execution Order](ADR-0014-run-driven-adapter-model.md) — Why adapter is called before state persistence
- [ADR-0029 — Run Maintenance Service Extraction](ADR-0029-run-maintenance-service.md) — Reconciliation added to this service
- [Temporal Engine Policies](../architecture/engine/adapters/temporal/EnginePolicies.md) — workflowId derivation from `runId`

---

End of ADR-0030
