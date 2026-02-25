# Decision Log — Engine / Planner / State Contract Hardening

- Version: `v1.0.0`
- Status: `final`
- Date (UTC): `2026-02-21`
- Playbook ref: `PLAYBOOK_NEXT_STEPS_PLANNER_ENGINE_STATE_2026-02-21.md`
- Strategy selected: **Option B — Incremental contract-first hardening**
- PRs addressed: PR-1 (docs), PR-2 (contract hardening), PR-4 (runtime decoupling)

---

## Context

An executive review of ADR compliance identified five critical/high-severity gaps
between the normative ADR specifications and the running implementation.
The playbook selected Option B (incremental PRs) over Option A (full redesign)
to minimize regression risk and preserve delivery velocity.

---

## Decision 1 — Remove IPlanFetcher from engine; adapter receives PlanRef

### WHAT

Removed `planFetcher: IPlanFetcher` from `WorkflowEngineDeps`.
Changed `IProviderAdapter.startRun` signature from `(plan: ExecutionPlan, ctx)` to `(planRef: PlanRef, ctx)`.
Deleted `IPlanFetcher.fetch` call from `WorkflowEngine.startRun`.

### FOR

Comply with ADR-0012 (Plan Integrity Ownership) and ADR-0014 (Run-Driven Adapter Model).
Establish the adapter as the sole trust boundary for plan bytes and SHA-256 verification.

### WHY

The engine fetching plan bytes before invoking the adapter made the engine responsible for
a security and integrity concern that belongs to the adapter layer.
ADR-0012 is explicit: "The engine MUST NOT fetch plan bytes before calling startRun."
This violation also prevented adapters from performing their own integrity checks
(e.g., SHA-256 verification against the PlanRef hash).

---

## Decision 2 — Make bootstrapRunTx atomic with provider refs (eliminate saveProviderRef)

### WHAT

Restructured `startRun` to:

1. Call `adapter.startRun(planRef, ctx)` first.
2. Pass the returned `EngineRunRef` to `buildRunMetadata` (new third parameter).
3. Call `bootstrapRunTx` with provider refs already embedded in `RunMetadata`.
4. Added compensation `adapter.cancelRun(runRef)` if `bootstrapRunTx` fails.

Removed `saveProviderRef` private method and all associated calls.

### FOR

Eliminate the two-phase write gap that created a window for orphaned runs
(workflow started in provider, but no provider refs stored in state).

### WHY

The previous sequence (bootstrap → adapter start → saveProviderRef) had a crash window
between steps 2 and 3. A crash there left the run in an orphaned state with no way to
reconcile the provider workflow back to the engine's state store.
ADR-0013 requires bootstrapRunTx to be atomic and include all run identity fields upfront.
By calling the adapter first and including its response in the single bootstrap call,
the write becomes idempotent and the orphan window disappears.

---

## Decision 3 — Engine emits RunCancelRequested; adapter owns RunCancelled

### WHAT

Changed `cancelRun` to emit `RunCancelRequested` (non-terminal intent event)
instead of `RunCancelled` (terminal event).
Changed CANCEL signal mapping from `RunCancelled` → `RunCancelRequested`.
Added `RunCancelRequested` to `EventType` union.
Added `cancelling: boolean` to `WorkflowSnapshot`.
`SnapshotProjector` sets `cancelling = true` on `RunCancelRequested`
and emits `substatus: 'CANCELLING'` from `snapshotToStatus`.
Added `CANCELLING` to `RunSubstatus` in `@dvt/contracts` (canonical type source).

### FOR

Comply with ADR-0007 (Run Cancellation Semantics).
Preserve the event-sourcing invariant that terminal state changes are owned by the party
that actually executes them (the adapter workflow context).

### WHY

Emitting `RunCancelled` from the engine synchronously after `adapter.cancelRun` is incorrect:
`adapter.cancelRun` initiates cancellation, but the workflow may not have stopped yet.
`RunCancelled` must be emitted by the adapter from inside the workflow when it actually terminates.
The engine can only record its intent (`RunCancelRequested`) and transition to a
`RUNNING/CANCELLING` substatus while waiting for the adapter to emit the terminal event.
This is the standard saga compensation pattern for distributed cancellation.

---

## Decision 4 — Fix signalKey to use SHA256 per ADR-0008; exclude tenantId

### WHAT

Replaced `IdempotencyKeyBuilder.signalKey(tenantId, runId, req)` with
`signalKey(params: { runId, logicalAttemptId, planId, planVersion }, req)`.
Preimage: `SHA256(runId | 'SIGNAL' | req.type | req.signalId | logicalAttemptId | planId | planVersion [| stepId])`.
`tenantId` excluded. Updated `WorkflowEngine.emitSignalDerivedRunEvent` call site.

### FOR

Comply with ADR-0008 (Signal Idempotency).
Guarantee that signal idempotency keys are stable across tenants and schema versions.

### WHY

`tenantId` is an envelope routing field, not a signal identity field.
Including it in the hash means the same logical signal sent from a different tenant context
(e.g., after tenant migration or in a test environment) would produce a different key,
breaking idempotent replay.
ADR-0008 INV-SIGNAL-004 is explicit: "tenantId MUST NOT influence hash."
The old plain string join (without SHA256) also violated the hash algorithm requirement.

---

## Decision 5 — Annotate ADR-0010 §4: payload excluded from idempotency preimage

### WHAT

Added a supersession block to ADR-0010 §4 documenting that `payload` is excluded
from the idempotency key preimage per RunEvents v2.0.1 and `IdempotencyKeyBuilder`.

### FOR

Remove the contradiction between ADR-0010 §4 (which listed `payload`) and the
normative implementation (`IdempotencyKeyBuilder.runEventKey` which excludes it).

### WHY

Payload field names and serialization can vary across producer versions and schema revisions.
Including `payload` in the hash makes the key non-deterministic at replay boundaries,
which defeats the purpose of idempotency.
The logical identity of an event is fully captured by `eventType | runId | stepIdOrRUN |
logicalAttemptId | planId | planVersion` — payload is ephemeral data, not identity.

---

## Decision 6 — Remove validatePlanCapabilities and 4 duplicate helpers (deferred to PR-3)

### WHAT

Removed `validatePlanCapabilities`, `shouldThrowForUnsupportedCapabilities`,
`shouldThrowForTargetAdapterMismatch`, `hasUnsupportedCapabilities`, `isTargetAdapterMismatch`
from `WorkflowEngine`.
Also removed `CapabilitiesNotSupportedError` and `TargetAdapterMismatchError` imports.

### FOR

Unblock the adapter-first startRun restructure without retaining broken capability gating
that rejected any plan with non-empty `requiresCapabilities`.

### WHY

The previous implementation threw unconditionally on any `requiresCapabilities` entry,
making it impossible to run any capability-aware plan.
Proper gating requires an auto-generated adapter capability matrix (ADR PR-3 scope).
Shipping broken gating is worse than no gating — it silently prevents valid plans from running.
PR-3 will introduce the correct matrix-driven gating with CI enforcement.

---

## Quality gates checklist

- [x] GAP-001: ADR-0012/0014 — IProviderAdapter.startRun uses PlanRef
- [x] GAP-002: ADR-0013 — bootstrapRunTx atomic with provider refs
- [x] GAP-003: ADR-0007 — engine emits RunCancelRequested, not RunCancelled
- [x] GAP-004: ADR-0008 — signalKey uses SHA256, excludes tenantId
- [x] GAP-005: ADR-0010 §4 — payload exclusion annotated as superseded
- [x] GAPS_AND_FIXES.md updated (PR-1 documentation)
- [x] WorkflowEngine.test.ts updated to reflect new startRun semantics
- [ ] PR-3: capability matrix auto-generation + runtime enforcement (deferred)
- [ ] PR-5: CI governance gates for contract drift (deferred)
