---
title: ADR-0049 - RETRY_RUN is a separate recovery use case, not a canonical signal
status: Accepted
owner: Architecture / Engine / Contracts / Adapters / API
last_reviewed: 2026-04-08
---

# ADR-0049 - RETRY_RUN is a separate recovery use case, not a canonical signal

## Status

Accepted.

## Context

After `ADR-0048`, the canonical signal boundary still includes one retry verb:
`RETRY_RUN`.

That leaves the repository in a partially cleaned state:

- the shared `SignalType` contract still advertises `RETRY_RUN`;
- the shipped HTTP/API runtime surface exposes only `PAUSE`, `RESUME`, and
  `CANCEL`;
- `WorkflowEngineCoreService.signal(...)` still accepts `RETRY_RUN` even though
  it does not attach engine-owned semantics to it;
- `TemporalAdapter.signal(...)` rejects `RETRY_RUN` as `NotImplemented`;
- `ADR-0040` already says `RETRY_RUN` is business recovery, not a provider-native
  retry signal.

That combination is unstable.

A canonical signal is the wrong boundary for business recovery because
`RETRY_RUN` implies semantics that are richer than run-control signaling:

- authorization distinct from pause/resume/cancel;
- creation of a new recovery run rather than mutation of an existing run;
- reservation of the next `logicalAttemptId` in a lineage chain;
- source-run immutability;
- explicit parent/origin lineage;
- adapter realization that may differ by provider but must not change product
  meaning.

Those semantics belong to a dedicated recovery command surface, not to the
canonical signal enum.

## Decision

### 1. `RETRY_RUN` is removed from canonical `SignalType`

Canonical `SignalType` is narrowed to:

- `PAUSE`
- `RESUME`
- `CANCEL`

`RETRY_RUN` is not part of the generic `signal(...)` contract.

### 2. Run recovery is a separate engine use case

If DVT exposes run recovery, it MUST do so as a dedicated engine or application
use case rather than as `signal(..., { type: 'RETRY_RUN' })`.

The exact public entrypoint name may evolve, but the boundary rule is fixed:

- run recovery is a dedicated use case;
- run recovery is not a generic signal.

### 3. `ADR-0040` remains authoritative for recovery lineage semantics

This ADR does not replace `ADR-0040`.

`ADR-0040` still governs:

- `logicalAttemptId` as engine-owned business retry lineage;
- `parentRunId` and `originRunId` as recovery lineage metadata;
- the rule that `RETRY_RUN` creates a new `runId` rather than mutating the
  source run.

This ADR only changes the boundary used to express that semantics.

### 4. Canonical signal to provider command translation must be explicit

For the remaining canonical signals (`PAUSE`, `RESUME`, `CANCEL`), adapters MUST
translate engine-owned canonical semantics through an explicit provider signal
mapper.

The mapper MUST:

- accept only canonical signal values;
- map them to provider-native signal names or provider-private commands;
- fail closed on unsupported values.

This rule prevents adapters from silently inheriting speculative verbs from the
shared signal enum.

### 5. Realized lifecycle ownership remains runtime-owned

This ADR does not change `ADR-0047`.

When canonical signals lead to realized lifecycle facts, the runtime remains the
sole producer of those facts.

The engine MAY validate, dispatch, and record explicit request/audit facts, but
it MUST NOT append the same realized lifecycle `EventType` that the runtime
emits.

## Consequences

### Positive

- canonical signal vocabulary now matches the shipped run-control product
  surface;
- business recovery stops masquerading as a provider signal;
- adapters no longer need a `NotImplemented` branch for a speculative canonical
  signal;
- canonical-signal to provider-command translation becomes explicit and
  fail-closed.

### Negative

- active docs that still describe `RETRY_RUN` as a signal must be updated;
- tests and idempotency vectors that still model `RETRY_RUN` as a signal must be
  rewritten;
- a future recovery feature will need a dedicated contract and implementation
  slice.

## Migration rule

The first implementation slice for this ADR MUST:

1. remove `RETRY_RUN` from `SignalType` and signal validation;
2. remove adapter `signal(...)` branches that advertise `RETRY_RUN` support;
3. add explicit provider signal mappers for the remaining canonical signals;
4. update active docs so they stop presenting `RETRY_RUN` as part of the generic
   signal boundary.

A later run-recovery slice may introduce a dedicated recovery command surface,
but it MUST NOT reintroduce `RETRY_RUN` through the generic signal enum.

## Related

- `ADR-0040` governs retry ownership and attempt authority.
- `ADR-0047` governs runtime-owned realized lifecycle for signal-driven
  transitions.
- `ADR-0048` removed `RETRY_STEP` from canonical `SignalType` and established the
  same use-case separation principle for step retry.
