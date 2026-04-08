---
title: RETRY_RUN boundary and provider signal mapper review
status: Active
owner: Architecture / Engine / Contracts / Adapters
last_reviewed: 2026-04-08
planning_type: review
---

# RETRY_RUN Boundary And Provider Signal Mapper Review

## Purpose

This review closes the remaining signal-boundary ambiguity after the
`PAUSE/RESUME` ownership fix and `RETRY_STEP` narrowing.

It answers two questions:

1. Should `RETRY_RUN` stay in canonical `SignalType`?
2. What is the smallest real implementation that makes canonical signal to
   provider-command translation explicit and fail-closed?

## Governing sources

- [ADR-0040](../../../adr/ADR-0040-retry-ownership-and-attempt-authority.md)
- [ADR-0047](../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md)
- [ADR-0048](../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md)
- [Engine boundary current/target review](20260407-engine-boundary-current-target-and-migration-review.md)
- [StartRunProtocol.v1.md](../../../architecture/engine/contracts/engine/StartRunProtocol.v1.md)

Primary code paths:

- `packages/@dvt/contracts/src/types/contracts.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/workflows.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- `packages/@dvt/engine/src/adapters/mock/MockAdapter.ts`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`

## Pre-slice current state

`RETRY_RUN` is currently the last retry-oriented verb still living inside the
canonical signal boundary.

That current state is inconsistent:

- contracts still include `RETRY_RUN` in `SignalType`;
- the API runtime command surface exposes only `PAUSE`, `RESUME`, and `CANCEL`;
- the engine signal path accepts `RETRY_RUN` but does not attach any engine-owned
  realized lifecycle semantics to it;
- the Temporal provider explicitly rejects `RETRY_RUN` inside `signal(...)`;
- `ADR-0040` already defines `RETRY_RUN` as business recovery that creates a new
  run lineage.

This is a classic boundary smell:

- the generic signal enum is carrying richer semantics than the boundary is
  designed to own;
- adapters are forced to advertise or reject a business recovery concept through
  a run-control API;
- consumers cannot infer whether `RETRY_RUN` is a real shipped capability or a
  speculative placeholder.

## Options considered

### Option A - Keep `RETRY_RUN` in canonical `SignalType`

Advantages:

- smallest code change now;
- no public contract shrink.

Disadvantages:

- keeps canonical surface wider than the shipped product;
- keeps `TemporalAdapter.signal(...)` in a `NotImplemented` posture for a
  supposedly canonical signal;
- conflicts with `ADR-0040`, which already says `RETRY_RUN` is business
  recovery, not provider-native retry.

Judgment: reject.

### Option B - Remove `RETRY_RUN` from canonical `SignalType` and do nothing else

Advantages:

- fixes contract drift immediately.

Disadvantages:

- leaves canonical signal to provider command translation implicit inside adapter
  switch statements;
- closes `WE-HX-4-C` but leaves `WE-HX-4-B` underspecified in code.

Judgment: better than Option A, but incomplete.

### Option C - Remove `RETRY_RUN` from canonical `SignalType` and add explicit provider signal mappers

Advantages:

- canonical signal vocabulary matches the shipped run-control surface;
- provider translation is explicit and fail-closed;
- no longer requires adapters to carry speculative retry-signal branches;
- gives `WE-HX-4-A/B/C` a real executable closure path.

Disadvantages:

- touches contracts, engine, adapters, tests, and docs in one slice;
- does not implement future recovery itself.

Judgment: accept.

## Decision

This review recommends and the implementation slice adopts Option C.

### Boundary rule

Canonical `SignalType` is only:

- `PAUSE`
- `RESUME`
- `CANCEL`

`RETRY_RUN` is removed from `signal(...)` and reserved for a future dedicated
recovery use case governed by `ADR-0040`.

### Provider mapper rule

The adapter signal path remains for canonical run-control signals only.

Each adapter must translate canonical signal requests through an explicit mapper
that:

- accepts only canonical signal values;
- maps them to provider-native workflow signal names or provider-private
  commands;
- fails closed on anything else.

This makes the seam explicit without forcing a broader ownership migration of
`IProviderAdapter` in the same slice.

## Implemented outcome

The current implementation now reflects this decision:

- `SignalType` contains only `PAUSE`, `RESUME`, and `CANCEL`;
- `WorkflowEngineCoreService.signal(...)` rejects `RETRY_RUN` at contract
  validation;
- `TemporalAdapter.signal(...)` and `MockAdapter.signal(...)` translate only
  canonical run-control signals through explicit mapping helpers;
- active docs, planning, evidence, and risk surfaces record `RETRY_RUN` as a
  future dedicated recovery use case rather than a generic signal.

## Why this is the correct boundary

### Fowler rationale

This is an explicit boundary correction, not refactoring theater.

- `signal(...)` is a narrow control surface.
- `RETRY_RUN` is a richer application command with lineage, retry-budget, and
  authorization semantics.
- Those are different reasons to change, so they should not share one enum or
  one transport surface.

Keeping them mixed would preserve a boundary that changes for two unrelated
causes:

- run-control semantics;
- business recovery semantics.

That is the wrong abstraction.

### Mature-system comparison

- Temporal keeps technical retries in runtime policy and models business
  recovery in workflow/application semantics, not in a generic runtime signal
  enum.
- Step Functions exposes redrive/recovery as an explicit operation, not as a
  universal signal verb.
- Airflow treats task clearing and rerun operations as explicit scheduler
  operations, not generic runtime-control signals.

The stable pattern is the same: control signals stay narrow, recovery commands
get explicit semantics.

## Field and surface impact

### What stays canonical in `SignalRequest`

- `signalId`
- `type`
- `reason?`
- `requestedAt?`

### What changes

- `SignalType` drops `RETRY_RUN`.
- `WorkflowSignals` drops `RETRY_RUN`.
- adapter `signal(...)` implementations stop advertising retry-recovery through
  the signal path.

### What does not change in this slice

- `ADR-0040` recovery lineage rules;
- run-context resolution for `logicalAttemptId`;
- future run-recovery API shape.

## Planning impact

This slice is the executable closure path for the remaining open parts of
`WE-HX-4`:

- `WE-HX-4-A`: canonical signals now contain only engine-owned run-control
  semantics;
- `WE-HX-4-B`: adapters translate through explicit provider signal mappers;
- `WE-HX-4-C`: retry-oriented signal ownership is now explicit.

## Acceptance criteria for implementation

- `SignalType` no longer includes `RETRY_RUN`.
- `WorkflowEngineCoreService.signal(...)` rejects `RETRY_RUN` at contract
  validation.
- `TemporalAdapter.signal(...)` and `MockAdapter.signal(...)` dispatch only the
  remaining canonical signals through explicit mapping helpers.
- active docs stop presenting `RETRY_RUN` as part of the generic signal
  boundary.
- planning, evidence, and risk surfaces explicitly record that `RETRY_RUN`
  remains a future dedicated recovery use case rather than a signal.
