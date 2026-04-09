---
title: ADR-0048 - RETRY_STEP is a separate engine use case, not a canonical signal
status: Accepted
owner: Architecture / Engine / Contracts / API
last_reviewed: 2026-04-08
---

# ADR-0048 - RETRY_STEP is a separate engine use case, not a canonical signal

## Status

Accepted.

Historical note: this ADR remains the decision of record for `RETRY_STEP`.
`RETRY_RUN` was still open when this ADR was accepted and was later resolved by
`ADR-0049` as a separate recover-run use case outside canonical `SignalType`.

## Context

The current canonical signal contract still includes `RETRY_STEP` in
`SignalType`, but the shipped system does not treat it as a real canonical
signal:

- the HTTP/API runtime surface only exposes `PAUSE`, `RESUME`, and `CANCEL`;
- `WorkflowEngineCoreService.signal(...)` accepts `RETRY_STEP`, but does not
  assign any engine-owned semantics to it;
- `TemporalAdapter.signal(...)` rejects `RETRY_STEP` as `NotImplemented`;
- `ADR-0040` already states that `RETRY_STEP` remains unsupported and requires a
  separate decision;
- the 2026-04-07 engine-boundary review concluded that `RETRY_STEP` should be
  adapter-private by default unless DVT explicitly promotes it to governed step
  retry semantics.

That leaves a contract drift:

- canonical `SignalType` is wider than the real product surface;
- a step-level recovery operation is being modeled as if it were equivalent to
  control signals such as `PAUSE`, `RESUME`, and `CANCEL`;
- the current signal boundary encourages consumers to treat `RETRY_STEP` as a
  generic runtime command rather than a governed product operation.

`RETRY_STEP` is not just control-plane signaling.

A real step retry requires product semantics that do not belong in a generic
signal enum:

- authorization for partial recovery;
- admission rules tied to run and step state;
- idempotency and request identity;
- business lineage for the new logical step attempt;
- fail-closed behavior when a provider cannot realize step retry;
- runtime-owned lifecycle facts for the new attempt.

That is a richer application command boundary than `signal(...)` is meant to
carry.

## Decision

### 1. `RETRY_STEP` is removed from canonical `SignalType`

`RETRY_STEP` is not a canonical signal.

Canonical `SignalType` remains reserved for the current run-control signal set:

- `PAUSE`
- `RESUME`
- `CANCEL`

The contract MUST NOT advertise `RETRY_STEP` as part of the generic signal
boundary.

### 2. Step retry is a separate engine use case

If DVT ships step-scoped retry semantics, it MUST do so as a dedicated
application or engine use case, not as `signal(..., { type: 'RETRY_STEP' })`.

The intended shape is an explicit step-retry command surface such as:

```ts
retryStep(runRef, stepId, request);
```

The exact public method or transport shape may evolve, but the boundary rule is
fixed:

- step retry is a dedicated use case;
- step retry is not a generic signal.

### 3. Engine owns step-retry semantics; adapter owns realization details

For the eventual step-retry use case:

- the engine owns authorization, admission, idempotency, and product semantics;
- the adapter may declare whether it can realize the retry for a given runtime;
- if the runtime cannot realize the operation, the engine MUST fail closed or
  use an explicitly governed alternative path.

The meaning of step retry MUST NOT vary by provider.

### 4. Runtime-owned lifecycle still applies

If step retry is introduced later, realized lifecycle facts for the new attempt
MUST remain runtime-owned, consistent with `ADR-0047`.

The engine MAY record request or audit facts, but it MUST NOT fabricate the
realized lifecycle events of the retried step attempt.

### 5. Later ADRs narrowed `RETRY_RUN` separately

At acceptance time, this ADR intentionally left `RETRY_RUN` outside its scope.
That residual boundary question was later resolved by `ADR-0049`.

This ADR remains intentionally narrow:

- it removes `RETRY_STEP` from canonical signals;
- it does not govern the dedicated recover-run boundary introduced later.

## Consequences

### Positive

- canonical signal vocabulary is narrower and no longer advertises speculative step retry;
- step-level recovery stops masquerading as a simple control signal;
- engine and adapter responsibilities for future step retry become clearer;
- contract drift is reduced immediately, while run-recovery posture is now
  governed separately by `ADR-0040` and `ADR-0049`.

### Negative

- the repository loses a speculative future signal from the canonical contract;
- older active documents that describe `RETRY_STEP` as a signal must be updated
  or treated as stale;
- a later step-retry feature will need a dedicated contract and implementation
  slice instead of reusing the existing signal path.

## Migration rule

The first implementation slice for this ADR is contract narrowing:

1. remove `RETRY_STEP` from `SignalType` and `SignalRequest` validation;
2. remove runtime signal literals and tests that imply canonical support;
3. update active docs so they no longer present `RETRY_STEP` as a signal;
4. keep `RETRY_RUN` unchanged in this slice at the time of acceptance.

That migration MUST happen before any new provider expansion or signal-surface
work reuses the stale vocabulary.

## Related

- `ADR-0040` governs business retry ownership and attempt authority.
- `ADR-0047` governs runtime-owned realized lifecycle for signal-driven
  transitions and applies to any future step-retry lifecycle facts.
- `ADR-0049` later moved `RETRY_RUN` to a dedicated recover-run boundary.
- This ADR supersedes any active contract or guidance that still treats
  `RETRY_STEP` as part of canonical `SignalType`.
