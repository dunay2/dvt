# ADR-0007: Run Cancellation Semantics and Event Ownership

- **Status**: Proposed (Hardened revB)
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

If a run transitions to CANCELLING and no `RunCancelled` event is received
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

## Verification

### Invariants
- INV-CANCEL-001: Engine never emits RunCancelled
- INV-CANCEL-002: RunCancelRequested only emitted on successful request
- INV-CANCEL-003: Adapter emits RunCancelled only after real shutdown
- INV-CANCEL-004: Projector transitions only on RunCancelled
- INV-CANCEL-005: Stuck detection does not synthesize RunCancelled

---
End of ADR-0007
