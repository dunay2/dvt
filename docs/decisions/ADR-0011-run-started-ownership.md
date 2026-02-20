# ADR-0011 — RunStarted Ownership

Status: Proposed  
Date: 2026-02-20

## Context

Emitting `RunStarted` before adapter/orchestrator acceptance causes invalid transitions when `adapter.startRun()` fails. Additionally, orchestrator adapters (Temporal/Conductor) have a non-obvious "acceptance" boundary: client start returns after server registration, not after workflow code begins executing.

## Decision

### Ownership

- The **engine** emits **RunQueued only**.
- The **adapter** exclusively owns emission of **RunStarted**.
- The engine MUST NOT emit RunStarted.

### Temporal / Conductor acceptance semantics (normative)

For orchestrator-based adapters (Temporal, Conductor):

- `RunStarted` MUST be emitted **from within the workflow execution context**:
  - **as the first operation of the workflow function body**
  - **before** scheduling the first activity/task.

This ensures `RunStarted` means: _workflow code began executing_, not merely that the server registered the start request.

For synchronous adapters (Mock):

- `RunStarted` MAY be emitted within `adapter.startRun()` after the adapter confirms it will execute the plan.

### Terminal sequences without RunStarted (normative)

Projectors MUST treat the following as valid terminal sequences:

- `RunQueued → RunFailed`
- `RunQueued → RunCancelled`

The absence of `RunStarted` MUST NOT be treated as an error condition (e.g., if the adapter fails before workflow execution begins).

### Idempotency (normative)

If RunStarted emission retries (e.g., Temporal activity retry), the adapter MUST use the standard idempotency key derivation. Duplicate emission is handled by append authority dedupe; no additional adapter-side dedupe logic is required.

## Consequences

- Prevents false-positive "started" state.
- Avoids duplicate RunStarted from mixed ownership.
- Makes orchestrator semantics explicit for implementers and projectors.

## Related

- RunEvents.v2 lifecycle semantics
- Engine boundary contracts (IWorkflowEngine)
- ADR-0003/ADR-0004 (execution model and state authority)
