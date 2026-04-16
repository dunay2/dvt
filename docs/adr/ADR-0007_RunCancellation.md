# ADR-0007: Run Cancellation Semantics and Event Ownership

- **Status**: Accepted
- **Date**: 2026-02-21
- **Owners**: Engine Domain / Adapter Layer
- **Related**:
  - ADR-0011: RunStarted Ownership
  - ADR-0004: Event Sourcing Strategy
  - ADR-0008: Signal Idempotency Derivation
  - ADR-0015: GetRunStatus read-model separation
  - ADR-0047: Runtime-owned realized lifecycle for signal-driven transitions
  - W3-1: Stuck Run Detection

---

## Context

Cancellation in workflow engines such as Temporal and Conductor is
asynchronous.

`cancelRun()` sends a request or signal, but the Engine cannot know when the
workflow has actually entered cancelling or when the workflow has actually
stopped.

If the Engine emits `RunCancelled` immediately:

- state may transition prematurely
- projectors may enter `CANCELLED` while workflow execution is still running
- replay determinism is violated

If the Engine also treats `RunCancelRequested` as its own default lifecycle
fact, the repository ends up with split ownership:

- command submission is recorded in one place
- realized cancellation lifecycle is recorded in another
- and the same public event type can mean different things depending on the
  producer

The accepted forward direction of the repository now follows the same
runtime-owned rule used for other signal-driven lifecycle transitions in
ADR-0047.

---

## Decision

### 1) Ownership

- The Engine MUST NOT emit `RunCancelRequested` or `RunCancelled` as canonical
  cancellation lifecycle facts.
- The runtime execution context MUST emit `RunCancelRequested` when the run
  actually enters cancelling.
- The runtime execution context MUST emit `RunCancelled` only when cancellation
  has actually completed.

### 2) Distinct audit/request facts remain allowed, but must use a different event type

- The Engine MAY record request, audit, or operator-intent facts about
  cancellation submission.
- Those facts MUST use a distinct event type.
- `RunCancelRequested` is reserved for the runtime-owned non-terminal entry into
  cancelling.

### 3) Idempotency

- Multiple `cancelRun()` calls MUST be idempotent.
- At most one `RunCancelRequested` per run.
- At most one `RunCancelled` per run execution.

### 4) Stuck cancellation detection (interaction with W3-1)

Between `RunCancelRequested` and `RunCancelled`, the run's `status` remains
`RUNNING`. The `substatus` MUST be `CANCELLING`. Projectors MUST NOT advance to
`CANCELLED` until `RunCancelled` is received.

If `RunCancelRequested` has been emitted and no `RunCancelled` is received
within a configurable SLA, the platform SHOULD:

- emit an operational alert
- optionally mark the run as `CANCELLATION_STUCK` as an operational state only,
  not an event
- allow manual intervention

The system MUST NOT synthesize `RunCancelled` in this scenario.

### 5) Interaction with ADR-0008

If cancellation is initiated through canonical signals:

- the signal MUST include a stable `signalId`
- signal idempotency MUST follow ADR-0008 SHA256 derivation
- signal correlation MAY be carried by runtime-owned cancellation lifecycle
  payload or related audit surfaces, but that correlation MUST NOT reassign
  ownership of `RunCancelRequested` back to the Engine

---

## Documents to Update (Normative Impact)

1. **`RunEvents.v1.md`**
   - Add `RunCancelRequested` to the known lifecycle catalog.
   - Define it as the runtime-owned non-terminal cancelling transition.
2. **`ExecutionSemantics.v1.md`**
   - Include the ordered runtime-owned cancellation lifecycle in the run-level
     event set and ownership section.
3. **`IWorkflowEngine.v1.md`**
   - Keep engine ownership at validation and dispatch, and make the canonical
     read-path rule explicit on `getRunStatus()`.
4. **`IProviderAdapter.v1.md`**
   - Clarify that provider `getRunStatus()` is live provider enrichment rather
     than the authoritative caller-visible state model.
5. **`SignalsAndAuth.v1.md`**
   - Align `CANCEL` with the runtime-owned lifecycle
     `RunCancelRequested -> RunCancelled`.
6. **Projector and run-domain semantics**
   - `RunCancelRequested` sets `substatus = 'CANCELLING'` without advancing
     terminal status.

---

## Verification

### Invariants

- INV-CANCEL-001: Engine never emits `RunCancelRequested` or `RunCancelled` as
  canonical cancellation lifecycle facts
- INV-CANCEL-002: Runtime emits `RunCancelRequested` only when execution has
  actually entered cancelling
- INV-CANCEL-003: Runtime emits `RunCancelled` only after real shutdown
- INV-CANCEL-004: Projector transitions to `CANCELLED` only on `RunCancelled`
- INV-CANCEL-005: Stuck detection does not synthesize `RunCancelled`
- INV-CANCEL-006: Run status remains `RUNNING` with substatus `CANCELLING`
  between request and confirmation
- INV-CANCEL-007: Any engine-side request or audit fact uses a distinct event
  type rather than overloading `RunCancelRequested`

### Required Tests (mandatory CI)

- `test/engine/cancel-dispatch-does-not-emit-cancellation-lifecycle.test.ts`
- `test/projector/run-cancel-requested-sets-cancelling-substatus.test.ts`
- `test/projector/run-cancelled-transitions-from-cancelling.test.ts`
- `test/engine/stuck-cancellation-no-synthesize.test.ts`
- `test/idempotency/cancel-request-idempotency.test.ts`

---

End of ADR-0007
