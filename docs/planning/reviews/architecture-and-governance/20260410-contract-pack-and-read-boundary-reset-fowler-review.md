---
title: Contract pack and read boundary reset Fowler review
status: Active
owner: Architecture / Engine / Contracts / Docs
last_reviewed: 2026-04-10
planning_type: review
---

# Contract pack and read boundary reset Fowler review

## Purpose

This review answers one question only:

Should the repository keep patching the mixed engine-runtime contract pack and
the overloaded run-status read boundary, or should it reset both around one
explicit architectural line and then converge code, contracts, and diagrams on
that line?

This document is deliberately architecture-first. It is not constrained by
backward-compatibility posture because the repository is still pre-stable and
the goal of this slice is to set a cleaner baseline before more behavior
accretes around the wrong shapes.

## Decision under review

1. Reset the active engine-runtime contract pack to one canonical `v1` line.
2. Stop reusing one semantic status model for both canonical state and
   provider-live diagnostics.
3. Use the reset as a doc-first execution slice that drives later
   implementation and diagram convergence.

## Governing sources

Architecture and ADRs:

- `docs/architecture/reference-architecture.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0007_RunCancellation.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md`

Contract and versioning policy:

- `docs/architecture/components/engine/contracts/VERSIONING.md`
- `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
- `docs/architecture/components/engine/contracts/engine/RunEvents.v1.md`
- `docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md`
- `docs/architecture/components/engine/contracts/engine/SignalsAndAuth.v1.md`

Current architecture and planning:

- `docs/architecture/system/subsystems/read/index.md`
- `docs/architecture/system/subsystems/canonical-run-lifecycle/index.md`
- `docs/architecture/system-delivery-status.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c6-cancel-lifecycle-ownership-truth-sync-plan-20260410.md`
- `docs/planning/state/agent-lane-a.yaml`

Primary code paths:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- `apps/api/src/application/services/getRunStatusUseCase.ts`

## Executive judgment

The reset is the correct move.

Continuing to patch the current pack would keep compounding three kinds of
drift:

1. a mixed active contract line (`v2`, `v1.1`, and `v1`) with no single
   canonical read order
2. one status shape doing two jobs with different authority
3. active subsystem pages drifting into target-state storytelling instead of
   current-state description

Because the repository is still pre-stable and there is no backward
compatibility requirement for this slice, the least risky path is not to keep
incrementing the mixed line. The least risky path is to reset to a single
canonical `v1` pack, rewrite it in place, and remove competing active surfaces
from the tree.

## Good lessons to preserve

These are the strong parts of the current direction and should survive the
reset:

- runtime owns realized lifecycle facts
- engine owns command validation, authorization, and canonical read access
- event log plus snapshot remain the caller-visible source of truth
- provider live status is enrichment or diagnostics, not canonical authority
- the `WorkflowEngine` decomposition already points in the right hexagonal
  direction
- docs-first and QA-template-first execution are the right discipline for this
  kind of boundary reset

## Findings

### `F1` High - no single active contract line exists for the engine-runtime boundary

The active truth is split across:

- `IWorkflowEngine.v1`
- `RunEvents.v1`
- `ExecutionSemantics.v1`
- `IProviderAdapter.v1`
- `SignalsAndAuth.v1`

This is not just cosmetic drift. It means a reader can follow three different
generation lines and still believe they are reading the current contract pack.

### `F2` High - canonical state and provider diagnostics still share one semantic shape

The current boundary still leaks one overloaded model:

- engine canonical read and provider enrichment both return
  `RunStatusSnapshot`
- adapter `getRunStatus()` is still named as if it were a canonical state
  boundary rather than a provider-live view

In a Fowler-style model, these are different read concerns and should not share
one primary semantic type.

### `F3` Medium - active subsystem diagrams still mix current and target structures

The read subsystem page currently presents decomposition that is not present in
code. That is a discipline problem: an active as-is page must describe the
current boundary truth, not a future refactor the repository has not executed
yet.

### `F4` Medium - the provider boundary is still named from the wrong perspective

`IProviderAdapter.getRunStatus()` is named from the perspective of canonical
state. The actual role is provider-live observation. The boundary name still
pushes readers toward the wrong authority model.

### `F5` Medium - the current AR-C6 truth-sync is valid but too local

The `AR-C6` work captured the right cancellation ownership lesson, but it
cannot close the larger engine-runtime boundary problem on its own. Without a
pack-level reset, it remains a local cleanup around cancellation rather than a
full contract-pack correction.

## Smells and drift to remove

- mixed active contract generations
- `RunStatusSnapshot` overloaded as canonical state and provider-live view
- adapter read method named as if it owned authoritative status
- active subsystem pages that present target structures as current
- patch-by-patch truth sync without resetting the broader boundary

## Comparison with mature systems

Mature workflow and event-sourced systems do not usually make these mistakes:

- they separate command submission from realized lifecycle
- they keep canonical read models distinct from controller or provider
  observations
- they avoid one DTO doing both public truth and internal diagnostics
- they avoid mixed active reading paths for the same boundary; in an exploratory
  pre-stable phase that usually means one live pack only

The repository should align with that model. The good news is that the current
ADRs already point in that direction. The reset is mainly about making the
contract pack and read boundary finally reflect it cleanly.

In this repository's current phase, git supplies the historical trail. The
active docs tree does not need to preserve parallel active versions.

## Chosen architectural line

The future line should be:

1. one active engine-runtime contract pack on `v1`
2. explicit split between canonical run status and provider diagnostics
3. engine read boundary:
   - `getRunStatus() -> CanonicalRunStatus`
   - `getRunEnrichment() -> RunStatusEnrichment`
4. provider boundary:
   - `getProviderStatusView() -> ProviderRunStatusView`
5. runtime-owned lifecycle facts remain:
   - `RunCancelRequested`
   - `RunCancelled`

This is a deliberate reset, not a rename-only cleanup.

The practical rule is:

- rewrite `v1` in place
- delete redirect, `v1.1`, `v2`, and `reference` siblings for the same active
  topic
- keep only one active reading path in `docs/`

## Realistic execution sequence

### `AR-A12` Contract pack and read boundary reset

Umbrella task for the reset.

### `AR-A12-A` Collapse the active engine-runtime contract pack to one canonical `v1` line

- create one active `v1` pack for:
  - `IWorkflowEngine`
  - `IProviderAdapter`
  - `RunEvents`
  - `ExecutionSemantics`
  - `SignalsAndAuth`
- rewrite those `v1` files in place as the only active contract surfaces
- remove mixed `v2`, `v1.1`, redirect, and `reference` siblings from the
  active tree
- rewrite the engine contract index and canonical entrypoints so they expose
  only one reading path

### `AR-A12-B` Split canonical status from provider-live diagnostics

- define explicit models for:
  - canonical run status
  - run-status enrichment
  - provider-live status view
- stop using one semantic type for both truth and diagnostics
- align contracts and target diagrams on that split before code changes

### `AR-A12-C` Converge implementation, current docs, and diagrams

- realign engine and API read paths to the new boundary
- rewrite active subsystem pages so current pages describe current code and
  target pages describe target architecture
- update current diagrams so they describe what is implemented after the reset,
  not what is merely intended

### Adjacent dependency

`RC-G1-B` remains the ownership-cleanup companion for moving non-shared
engine-owned ports out of `@dvt/contracts`. The reset does not replace that
slice; it gives `RC-G1-B` a cleaner target boundary to execute against.

## Recommendation

Approve the reset line.

Do not spend more effort polishing the mixed pack beyond honest truth surfaces
needed for this transition. Move immediately to the reset proposal, register the
slices in Lane A, and let implementation follow the new contract pack rather
than the current drift.
