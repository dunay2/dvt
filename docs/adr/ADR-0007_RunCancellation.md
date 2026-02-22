# ADR-0007: Run Cancellation Semantics and Event Ownership

- **Status**: Accepted
- **Date**: 2026-02-21
- **Owners**: Engine Domain / Adapter Layer
- **Related**:
  - ADR-0011: RunStarted Ownership
  - ADR-0004: Event Sourcing Strategy
  - ADR-0008: Signal Idempotency Derivation
  - W3-1: Stuck Run Detection

---

## Context

Cancellation in workflow engines (Temporal, Conductor) is asynchronous.

`cancelRun()` sends a request or signal, but the Engine cannot know
when the workflow has actually stopped.

If the Engine emits `RunCancelled` immediately:

- State may transition prematurely
- Projectors may enter CANCELLED while workflow is still running
- Replay determinism is violated

---

## Decision

### 1) Ownership

- The Engine MUST NOT emit `RunCancelled`.
- The Adapter MUST emit `RunCancelled` from inside the workflow execution
  context when cancellation has actually completed.

### 2) RunCancelRequested (optional)

- The Engine MAY emit `RunCancelRequested` after successful submission
  of the cancellation request.
- This event is NON-terminal and represents intent only.

### 3) Idempotency

- Multiple `cancelRun()` calls MUST be idempotent.
- At most one `RunCancelRequested` per run.
- At most one `RunCancelled` per run execution.

### 4) Stuck cancellation detection (interaction with W3-1)

Between `RunCancelRequested` and `RunCancelled`, the run's `status` remains
`RUNNING`. The `substatus` MUST be set to `CANCELLING` (to be added to
`RunSubstatus` in `types.ts`). Projectors MUST NOT advance to `CANCELLED`
until `RunCancelled` is received.

If `RunCancelRequested` has been emitted and no `RunCancelled` is received
within a configurable SLA (e.g., 5 minutes), the platform SHOULD:

- Emit an operational alert
- Optionally mark the run as `CANCELLATION_STUCK` (operational state only, NOT an event)
- Allow manual intervention

The system MUST NOT synthesize `RunCancelled` in this scenario.

### 5) Interaction with ADR-0008

If cancellation is implemented via signals:

- The signal MUST include a stable `signalId`
- The idempotency key MUST follow ADR-0008 SHA256 derivation
- `RunCancelRequested` MUST correlate with the `signalId`

---

## Documents to Update (Normative Impact)

1. **`packages/@dvt/engine/src/contracts/runEvents.ts`**
   - Add `'RunCancelRequested'` to the `EventType` union.
2. **`packages/@dvt/engine/src/contracts/types.ts`**
   - Add `'CANCELLING'` to `RunSubstatus`.
3. **`packages/@dvt/engine/src/core/SnapshotProjector.ts`**
   - Add `case 'RunCancelRequested'`: set `substatus = 'CANCELLING'` on the snapshot
     (no status change — run stays `RUNNING`).
4. **`RunEvents.v2.0.1.md`** (or bump to v2.1.0)
   - Add `RunCancelRequested` event definition and allowed transitions.

---

## Verification

### Invariants

- INV-CANCEL-001: Engine never emits RunCancelled
- INV-CANCEL-002: RunCancelRequested only emitted on successful request
- INV-CANCEL-003: Adapter emits RunCancelled only after real shutdown
- INV-CANCEL-004: Projector transitions to CANCELLED only on RunCancelled
- INV-CANCEL-005: Stuck detection does not synthesize RunCancelled
- INV-CANCEL-006: Run status remains RUNNING with substatus CANCELLING between request and confirmation

### Required Tests (mandatory CI)

- `test/engine/cancel-requested-does-not-emit-cancelled.test.ts`
- `test/projector/run-cancel-requested-sets-cancelling-substatus.test.ts`
- `test/projector/run-cancelled-transitions-from-cancelling.test.ts`
- `test/engine/stuck-cancellation-no-synthesize.test.ts`
- `test/idempotency/cancel-request-idempotency.test.ts`

---

End of ADR-0007
