# GAPS_AND_FIXES — Engine / Planner / State Contract Hardening

- Version: `v2.0.0` (updated from v1.0 — 2026-02-12)
- Status: `current`
- Date (UTC): `2026-02-21`
- Playbook: `PLAYBOOK_NEXT_STEPS_PLANNER_ENGINE_STATE_2026-02-21.md` → Option B, PR-1 + PR-2 + PR-4
- Scope: `packages/@dvt/engine`, `packages/@dvt/contracts`, `docs/adr/`

---

## Summary

This document records the gaps identified between the normative ADR specifications and
the implementation state as of 2026-02-21, and the corrective actions taken.
All changes follow the incremental Option B strategy from the playbook.

---

## GAP-001 — ADR-0012 not implemented: engine fetched plan bytes (CRITICAL)

### Problem

`IProviderAdapter.startRun` accepted `ExecutionPlan` (resolved bytes) instead of `PlanRef`.
`WorkflowEngine` called `IPlanFetcher.fetch` before invoking the adapter.
This directly violated ADR-0012 ("Adapter owns plan bytes fetch + SHA-256 verification;
engine must not fetch bytes") and ADR-0014 ("Run-Driven Adapter Model").

### Fix

- **`IProviderAdapter.ts`**: changed `startRun(plan: ExecutionPlan, ctx)` → `startRun(planRef: PlanRef, ctx)`. Version bumped to 2.0.0.
- **`ConductorAdapterStub.ts`**: updated to match new interface. Version bumped to 2.0.0.
- **`WorkflowEngine.ts`**: removed `planFetcher` from `WorkflowEngineDeps`; removed `IPlanFetcher` import; removed `planFetcher.fetch` call from `startRun`. Version bumped to 2.0.0.
- **`WorkflowEngine.test.ts`**: removed `makeMockPlanFetcher`, removed `planFetcher` from `createEngine`, updated mock adapter `startRun` signature.

### ADR traceability

- ADR-0012: Plan Integrity Ownership
- ADR-0014: Run-Driven Adapter Model

---

## GAP-002 — ADR-0013 two-phase write: orphaned-run window (HIGH)

### Problem

`startRun` followed the sequence:

1. `bootstrapRunTx` (stores metadata + RunQueued)
2. `adapter.startRun` (starts workflow)
3. `saveProviderRef` (separate write — two-phase)

If the process crashed between steps 2 and 3, the run had no provider refs (orphaned).
`saveProviderRef` created a non-atomic second write outside the bootstrap transaction.

### Fix

- **`WorkflowEngine.ts`**: restructured `startRun` to call `adapter.startRun(planRef, ctx)` first,
  then pass the returned `runRef` to `buildRunMetadata`, which now populates provider refs
  directly. The single `bootstrapRunTx` call includes provider refs atomically.
  Compensation (`adapter.cancelRun`) is triggered if `bootstrapRunTx` fails after adapter start.
- **`buildRunMetadata`**: now accepts `runRef: EngineRunRef` as third parameter and fills
  `providerWorkflowId`, `providerRunId`, `providerNamespace`, `providerTaskQueue`, `providerConductorUrl`.
- **`saveProviderRef` private method**: removed entirely.

### ADR traceability

- ADR-0013: bootstrapRunTx atomicity

---

## GAP-003 — ADR-0007 violated: engine emitted RunCancelled directly (HIGH)

### Problem

`cancelRun` emitted `RunCancelled` immediately after calling `adapter.cancelRun`.
Per ADR-0007, `RunCancelled` is a terminal event that MUST be emitted by the adapter
from within the workflow context, not by the engine.
The engine MUST only emit `RunCancelRequested` (intent, non-terminal).

The `CANCEL` signal mapping also incorrectly mapped to `RunCancelled`.

### Fix

- **`WorkflowEngine.ts`** `cancelRun`: changed `emitRunEvent(meta, 'RunCancelled')` → `emitRunEvent(meta, 'RunCancelRequested')`. Renamed metric `dvt.run.cancelled` → `dvt.run.cancel_requested`.
- **`WorkflowEngine.ts`** `mapSignalToRunEventType`: changed `CANCEL → 'RunCancelled'` → `CANCEL → 'RunCancelRequested'`.
- **`runEvents.ts`**: added `'RunCancelRequested'` to `EventType` union.
- **`runEvents.ts`** `WorkflowSnapshot`: added `cancelling: boolean` field.
- **`SnapshotProjector.ts`**: added `case 'RunCancelRequested'` (sets `snap.cancelling = true`); `RunCancelled` sets `snap.cancelling = false`; `snapshotToStatus` emits `substatus: 'CANCELLING'` when `snap.cancelling` is true.
- **`@dvt/contracts` `RunSubstatus`**: added `'CANCELLING'` to canonical type, declaration file, and Zod schema.
- **Engine-local `types.ts`** `RunSubstatus`: also added `'CANCELLING'`.

### ADR traceability

- ADR-0007: Run Cancellation Semantics

---

## GAP-004 — ADR-0008 violated: signalKey included tenantId, no SHA256 (HIGH)

### Problem

`IdempotencyKeyBuilder.signalKey` used a plain string join with `tenantId` as first field.
ADR-0008 specifies:

- Formula: `SHA256(runId | 'SIGNAL' | signalType | signalId | logicalAttemptId | planId | planVersion [| stepId])`
- INV-SIGNAL-004: `tenantId` MUST NOT influence hash (envelope field, not identity field)
- INV-SIGNAL-003: `schemaVersion` MUST NOT influence hash

The old signature `signalKey(tenantId, runId, req)` passed `tenantId` as first positional arg.

### Fix

- **`idempotency.ts`** `signalKey`: new signature `signalKey(params: { runId, logicalAttemptId, planId, planVersion }, req)`. Preimage follows ADR-0008 formula. Uses `sha256Hex`.
- **`WorkflowEngine.ts`** `emitSignalDerivedRunEvent`: updated call site to new signature.

### ADR traceability

- ADR-0008: Signal Idempotency

---

## GAP-005 — ADR-0010 §4 included `payload` in idempotency preimage (MEDIUM)

### Problem

ADR-0010 §4 listed `payload` as a required component of the idempotency hash.
`IdempotencyKeyBuilder.runEventKey` (RunEvents v2.0.1) excludes `payload` because
payload content can drift across producers and schema versions, making payload-inclusion
non-deterministic at replay boundaries.

### Fix

- **`ADR-0010-run-event-envelope-split.md`** §4: annotated as partially superseded by RunEvents v2.0.1.
  `payload` exclusion is now the normative rule with explicit rationale.
  Canonical formula and implementation reference added.

---

## Deferred (PR-3)

### validatePlanCapabilities — capability gating not yet enforced

`WorkflowEngine` contained a `validatePlanCapabilities` method and 4 duplicate private
helpers that threw `CapabilitiesNotSupportedError` whenever `requiresCapabilities` was
non-empty — effectively blocking all capability-aware plans.

**Decision**: removed all 5 methods. Proper capability gating (auto-generated matrix,
schema-validated enum, CI staleness gate) is deferred to PR-3 per the playbook.

### logicalAttemptId hardcoded to 1

All event emissions use `logicalAttemptId: 1`. Proper domain-retry tracking
(increment on planner-driven retry) is a Phase 2 concern and is out of scope here.

---

## Files modified

| File                                                                  | Change                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`               | `startRun` → `PlanRef`; v2.0.0                                   |
| `packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts` | Match new interface; v2.0.0                                      |
| `packages/@dvt/engine/src/contracts/runEvents.ts`                     | `RunCancelRequested` EventType; `cancelling` in WorkflowSnapshot |
| `packages/@dvt/engine/src/contracts/types.ts`                         | `CANCELLING` RunSubstatus                                        |
| `packages/@dvt/engine/src/core/idempotency.ts`                        | `signalKey` SHA256 per ADR-0008                                  |
| `packages/@dvt/engine/src/core/SnapshotProjector.ts`                  | `RunCancelRequested` handling; `CANCELLING` substatus            |
| `packages/@dvt/engine/src/core/WorkflowEngine.ts`                     | ADR-0012/0013/0014 compliance; remove planFetcher; v2.0.0        |
| `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`               | Reflect new startRun semantics                                   |
| `packages/@dvt/contracts/src/types/contracts.ts`                      | `CANCELLING` RunSubstatus                                        |
| `packages/@dvt/contracts/src/types/contracts.d.ts`                    | `CANCELLING` RunSubstatus                                        |
| `packages/@dvt/contracts/src/schemas.ts`                              | `CANCELLING` in RunSubstatusSchema                               |
| `docs/adr/ADR-0010-run-event-envelope-split.md`                       | §4 annotated as superseded (payload exclusion)                   |
