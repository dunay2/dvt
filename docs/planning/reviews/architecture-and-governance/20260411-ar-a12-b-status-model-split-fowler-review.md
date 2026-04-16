---
title: AR-A12-B status model split Fowler review
status: Complete
owner: Architecture / Engine / Contracts / Docs
last_reviewed: 2026-04-13
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

## Reviewed smells

This review originally captured three pre-cutover smells:

### `F1` High - one status DTO carried three jobs

Before the cutover, `RunStatusSnapshot` was reused across canonical status,
provider-backed enrichment, and provider-live observation.

### `F2` High - the provider method was named from the wrong authority plane

Before the cutover, the adapter boundary exposed provider-live observation
through `getRunStatus()`, which read like canonical caller-visible truth.

### `F3` Medium - the enrichment path was compositionally invisible

Before the cutover, callers could not tell from the public contract whether
they were reading canonical status or an enriched composed view.

## Closure status

These reviewed smells are now resolved in the active tree:

- `RunStatusSnapshot` is removed from the active shared contract surface
- the adapter boundary now exposes `getProviderStatusView()`
- the enrichment path is explicit on `IRunEnrichmentService.getRunEnrichment()`
- active docs and planning surfaces describe the split as canonical status,
  provider diagnostics, and enrichment

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

## Executed plan

1. rewrote the active contract docs to expose the three objects explicitly
2. updated execution semantics and related docs so the authority split is
   defined in one place
3. removed the legacy shared-kernel status alias from active public exports and
   live consumers
4. aligned planning and closeout surfaces so the slice can be tracked as done

## Acceptance

- explicit status objects exist in the active contract pack
- the provider boundary no longer uses canonical-status naming
- current docs distinguish between canonical status, provider diagnostics, and
  enrichment
- `AR-A12-B` is trackable as its own closed architecture slice
