---
title: ADR-0047 - Runtime-owned realized lifecycle for signal-driven transitions
status: Accepted
owner: Architecture / Engine / Adapter Layer / Contracts
last_reviewed: 2026-04-07
---

# ADR-0047 - Runtime-owned realized lifecycle for signal-driven transitions

## Status

Accepted.

## Context

`ADR-0007` already established the correct ownership rule for cancellation:

- the engine may submit a command or record intent;
- the runtime must append the realized lifecycle fact when the workflow
  execution actually reaches that state.

`PAUSE` and `RESUME` have the same boundary property.

The engine can:

- authorize the signal,
- validate that the transition is allowed,
- dispatch the command to the provider adapter.

But it cannot know that the workflow has actually paused or resumed until the
runtime execution context reaches that state.

If the engine appends `RunPaused` or `RunResumed` at command-submission time,
the system creates the same defect that `ADR-0007` forbids for cancellation:

- state may advance before the runtime has actually changed state;
- replay and projector behavior become dependent on command timing rather than
  realized lifecycle timing;
- engine and runtime can both append the same realized lifecycle `EventType`.

The repository already moved the implementation to runtime-owned
`RunPaused` / `RunResumed`, but that boundary must be governed explicitly so it
is not reintroduced by future signal work.

## Decision

### 1. Realized lifecycle facts for signal-driven transitions are runtime-owned

For canonical signals that produce realized lifecycle state transitions, the
runtime execution context is the owner of the realized lifecycle event.

This applies to:

- `RunPaused`
- `RunResumed`
- `RunCancelled`

The engine core MUST NOT append those realized lifecycle events when it merely
submits the command.

### 2. Engine ownership remains validation and dispatch

The engine remains responsible for:

- tenant and authorization checks;
- transition validation;
- capability and compatibility checks;
- signal idempotency at the command boundary;
- dispatch to the selected adapter.

The engine is not reduced to a pass-through. It still governs the command
boundary. It simply does not own the realized lifecycle fact.

### 3. Intent and audit facts may remain engine-owned if they use distinct event types

The engine MAY emit request, intent, or audit facts, but it MUST NOT emit the
same realized lifecycle `EventType` that the runtime emits.

This preserves the `ADR-0007` distinction between:

- request or intent facts; and
- realized lifecycle facts.

### 4. `SignalTransitionGuard` remains validation-only in the current design

The current short-term strategy is accepted:

- `SignalTransitionGuard` MAY continue to speculatively simulate
  `RunPaused` / `RunResumed` transitions in memory;
- that simulation is validation-only;
- it MUST NOT persist the simulated event;
- it MUST NOT reassign realized lifecycle ownership back to the engine.

Later cleanup MAY replace speculative transition simulation with a narrower
allowed-signal table if that reduces mental overhead without weakening
validation.

### 5. `SignalSemantics` encodes no engine-derived pause/resume lifecycle mapping

The active `SignalSemantics` contract line must not silently encode stale
engine-derived `PAUSE` / `RESUME` behavior.

The current contract therefore leaves `PAUSE` and `RESUME` unmapped for
engine-derived lifecycle emission.

### 6. Forward rule for future signal types

Any future canonical `SignalType` that maps to a realized lifecycle fact MUST
follow the same rule:

- engine validates and dispatches;
- runtime realizes and appends the lifecycle event;
- engine does not append the same realized lifecycle `EventType`.

Provider-private control operations MUST NOT be promoted into canonical signal
semantics without an explicit architectural decision.

## Consequences

### Positive

- pause/resume ownership is aligned with cancellation ownership;
- replay and projector behavior depend on realized state, not command timing;
- duplicate producer paths for the same realized lifecycle event are
  structurally forbidden;
- future signal evolution has a clear rule instead of case-by-case drift.

### Negative

- the engine boundary becomes more explicit and therefore more opinionated;
- validation logic and realized lifecycle emission stay split across engine and
  runtime, which requires documentation and tests;
- older draft documents that assumed engine-owned pause/resume semantics must be
  treated as stale until updated or archived.

## Verification

The repository must keep explicit coverage for:

- engine no longer appending realized `RunPaused` / `RunResumed`;
- runtime remaining the sole producer of `RunPaused` / `RunResumed`;
- projector and replay remaining correct with runtime-owned lifecycle facts;
- signal idempotency under redelivery;
- `SignalTransitionGuard` validation behavior under the runtime-owned model.

## Related

- `ADR-0007` provides the ownership precedent for signal-driven realized
  lifecycle facts.
- `ADR-0014` continues to govern the run-driven adapter boundary.
