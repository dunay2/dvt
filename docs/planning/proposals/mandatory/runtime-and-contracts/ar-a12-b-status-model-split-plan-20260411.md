---
title: AR-A12-B status model split plan
author: Codex
status: Active
owner: Architecture / Engine / Contracts / Docs
last_reviewed: 2026-04-11
planning_type: proposal
---

# AR-A12-B status model split plan

## Purpose

Execute the second slice of the engine-runtime contract reset by replacing the
single overloaded run-status model with three explicit status objects:

- `CanonicalRunStatus`
- `RunStatusEnrichment`
- `ProviderRunStatusView`

This slice is architecture-first. It sets the contract model and target
read-boundary semantics before code convergence.

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md`
- `docs/architecture/components/engine/contracts/VERSIONING.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md`
- `docs/planning/reviews/architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md`

## Problem

The repository still overloads one semantic type, `RunStatusSnapshot`, across
three different authority planes:

1. canonical caller-visible run truth
2. engine-owned enrichment returned to callers on demand
3. provider-live observation used for diagnostics

That shape leak causes the contracts to imply more authority symmetry than the
architecture allows.

## Decision

The active contract line adopts three explicit status objects.

### `CanonicalRunStatus`

Owned by the canonical read plane.
Derived from the event log plus snapshot projector.
Returned by `IWorkflowEngine.getRunStatus()`.

```ts
interface CanonicalRunStatus {
  runId: string;
  status: RunStatus;
  substatus?: RunSubstatus;
  message?: string;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  execution?: RunExecutionEvidence;
}
```

Rules:

- `substatus` is canonical only; provider-scoped substatus tokens do not belong
  here.
- this object is the only caller-visible status truth
- projector and read-model rules define its lifecycle meaning

### `ProviderRunStatusView`

Owned by the provider diagnostics plane.
Returned by `IProviderAdapter.getProviderStatusView()`.

```ts
interface ProviderRunStatusView {
  provider: EngineRunRef['provider'];
  providerStatus: string;
  providerSubstatus?: string;
  message?: string;
  observedAt?: IsoUtcString;
}
```

Rules:

- provider status tokens are provider-native strings, not canonical `RunStatus`
- this object is diagnostic only
- provider-live observation must not replace canonical lifecycle truth

### `RunStatusEnrichment`

Owned by the engine read boundary.
Returned by `IRunEnrichmentService.getRunEnrichment()`.

```ts
interface RunStatusEnrichment {
  canonical: CanonicalRunStatus;
  providerView: ProviderRunStatusView;
}
```

Rules:

- enrichment composes canonical truth with provider diagnostics
- enrichment does not mutate or override canonical lifecycle meaning
- if provider diagnostics cannot be obtained, the enrichment path fails closed;
  it does not silently degrade to canonical-only success

## Contract consequences

`AR-A12-B` rewrites the active engine-runtime contract pack so that:

- `IWorkflowEngine.v1` exposes canonical read only via `getRunStatus()`
- `IRunEnrichmentService.v1` exposes `getRunEnrichment()`
- `IProviderAdapter.v1` exposes `getProviderStatusView()`
- `ExecutionSemantics.v1` defines the authority split and the three-model
  semantics explicitly
- `GlossaryContract.v1` defines the three objects and their ownership language

## Current implementation note

This slice is now materially landed at the public typed boundary.
`AR-A12-C` remains the governed follow-up for current-doc convergence,
diagram cleanup, and hardening guards around the split.

## Deliverables

- active contract docs updated:
  - `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`
  - `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
  - `docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md`
  - `docs/architecture/components/engine/contracts/engine/GlossaryContract.v1.md`
- planning and review surfaces updated for `AR-A12-B`
- current read-subsystem docs remain honest about the as-is code path while
  pointing to the new contract target

## Acceptance

- the active contract pack no longer uses one semantic status DTO across the
  canonical, enrichment, and provider-diagnostic planes
- the boundary names make authority explicit
- current docs do not pretend code convergence that has not landed yet
- planning treats `AR-A12-B` as the active slice after `AR-A12-A`
