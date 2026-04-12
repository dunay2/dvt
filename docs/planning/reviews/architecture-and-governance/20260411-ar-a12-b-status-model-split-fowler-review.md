---
title: AR-A12-B status model split Fowler review
status: Active
owner: Architecture / Engine / Contracts / Docs
last_reviewed: 2026-04-11
planning_type: review
---

# AR-A12-B status model split Fowler review

## Purpose

Review whether the repository should keep one overloaded run-status model or
split the boundary into explicit canonical, enrichment, and provider-live
status objects.

## Decision under review

Adopt three distinct contract objects:

1. `CanonicalRunStatus`
2. `RunStatusEnrichment`
3. `ProviderRunStatusView`

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md`
- `docs/architecture/components/engine/contracts/VERSIONING.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md`
- `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
- `docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md`
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`

## Executive judgment

The split is the correct architectural move.

A Fowler-style boundary does not let one DTO represent:

- canonical caller-visible truth
- provider diagnostics
- engine-owned composed enrichment

Those are different responsibilities with different authority.

## Current smells

### `F1` High - one status DTO still carries three jobs

The current contracts and code still reuse `RunStatusSnapshot` for:

- `WorkflowEngine.getRunStatus()`
- `WorkflowEngine.enrichRunStatus()`
- `IProviderAdapter.getRunStatus()`

That is a boundary smell, not a convenience.

### `F2` High - the provider method is named from the wrong authority plane

`getRunStatus()` on the adapter reads like canonical truth, but the method is
really provider-live observation.

### `F3` Medium - the enrichment path is compositionally invisible

The current engine contract returns the same type from both read methods, so a
caller cannot tell from the contract whether it is reading canonical truth or a
composed view.

## Chosen architecture

### Canonical read plane

`CanonicalRunStatus` is projected from persisted run events and snapshot state.
It is the only caller-visible truth for lifecycle status.

### Provider diagnostics plane

`ProviderRunStatusView` is runtime-local observation. It keeps provider-native
status tokens and must not redefine canonical lifecycle meaning.

### Engine enrichment plane

`RunStatusEnrichment` is the engine-owned composition of canonical truth plus
provider diagnostics. It is opt-in and diagnostic.

## Comparison with mature systems

Mature workflow and event-sourced systems keep these concerns separate:

- canonical state from persisted history
- runtime/controller observation for diagnostics
- composed operator-facing enrichment layered on top

They do not usually make provider-local observation masquerade as the same
semantic object as public lifecycle truth.

## Realistic plan

1. rewrite the active contract docs to expose the three objects explicitly
2. update glossary and execution semantics so the authority split is defined in
   one place
3. keep current read-subsystem docs honest about the as-is code path
4. converge code and current diagrams later under `AR-A12-C`

## Acceptance

- explicit status objects exist in the active contract pack
- the provider boundary no longer uses canonical-status naming
- current docs distinguish between contract target and current implementation
- `AR-A12-B` is trackable as its own architecture slice
