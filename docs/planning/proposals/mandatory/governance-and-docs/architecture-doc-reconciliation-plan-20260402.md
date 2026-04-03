---
title: Architecture Documentation Reconciliation Plan
status: Active
owner: Architecture / Docs / Delivery
last_reviewed: 2026-04-02
planning_type: proposal
---

# Architecture Documentation Reconciliation Plan

## Purpose

Reconcile architecture documentation with the real repository state, simplify
the active surface area, retire stale snapshots, and add the minimum guides
required to keep future architecture docs aligned with shipped behavior.

## Repo-Grounded Problem Statement

The repository currently has multiple documents that describe "the
architecture", but they do not carry the same truth level:

- [System Delivery Status](../../architecture/system-delivery-status.md) is the
  current implementation truth surface and already reflects runtime/API changes.
- [Architecture Atlas](../../architecture/atlas/architecture/architecture_atlas.md)
  still says the API exposes only infra endpoints and that engine orchestration
  is not composed as a runtime API service.
- [Planning Execution Model Index](../execution-model/index.md) is still a draft
  working area that overlaps with active architecture and planning surfaces.
- [Execution Runtime Domain](../domains/execution-runtime.md) and
  [Event Lifecycle And Retention Domain](../domains/event-lifecycle-and-retention.md)
  still point to proposal files that now live under `docs/planning/archive/`.

This creates three practical failures:

1. readers cannot tell which architecture page is authoritative;
2. active indexes point to historical or missing planning material;
3. architecture drift is corrected ad hoc instead of through one governed path.

## Target Outcome

The active tree should end with:

- one canonical repository-wide architecture orientation path;
- one explicit current-truth status surface;
- clearly marked supporting diagrams and domain references;
- archived or rewritten stale snapshots that no longer describe current code;
- contributor guides that explain how to keep architecture docs in sync after
  runtime changes.

## Canonical Truth Order

For repository-wide architecture questions, the source order should be:

1. [Reference Architecture](../../architecture/reference-architecture.md)
2. [System Delivery Status](../../architecture/system-delivery-status.md)
3. [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md)
4. [Concept System Map](../../concepts/system-map.md)

Supporting or derived surfaces must link back to that order instead of acting
as competing summaries.

## Pending Work

### Wave 1: Freeze the active architecture source set

- classify each top-level architecture/planning architecture document as
  `canonical`, `status`, `supporting`, or `historical`
- make the active reading order explicit in architecture and planning indexes
- stop draft execution-model notes from looking like equal peers to canonical
  architecture docs

Primary files to classify first:

- [Reference Architecture](../../architecture/reference-architecture.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [Architecture Index](../../architecture/index.md)
- [Concept System Map](../../concepts/system-map.md)
- [Architecture Atlas](../../architecture/atlas/architecture/architecture_atlas.md)
- [Planning Execution Model Index](../execution-model/index.md)

### Wave 2: Truth-correct active documents

- rewrite or declassify stale claims in active architecture docs
- repair planning-domain references that still point to moved or archived
  proposals
- normalize active docs to current runtime/API reality

Known drift candidates already confirmed:

- [Architecture Atlas](../../architecture/atlas/architecture/architecture_atlas.md)
- [Execution Runtime Domain](../domains/execution-runtime.md)
- [Event Lifecycle And Retention Domain](../domains/event-lifecycle-and-retention.md)

Additional system-level docs to review in the same pass:

- [DVT System Architecture](../../architecture/system-overview.md)
- [DVT Component Map](../../architecture/component-map.md)
- [DVT Domain Map](../../architecture/domain-map.md)
- [Planning Execution Model folder](../execution-model/index.md)

### Wave 3: Simplify and archive duplicate surfaces

- archive time-bound code snapshots that no longer describe current code
- merge or trim duplicate "system map" style documents where a simpler active
  surface already exists
- remove broken links and obsolete references from active indexes

Candidate archive-or-rewrite set:

- [Architecture Atlas](../../architecture/atlas/architecture/architecture_atlas.md)
  if retained only as a dated historical snapshot
- planning execution-model drafts under
  [docs/planning/execution-model/](../execution-model/index.md) if they remain
  exploratory rather than canonical

### Wave 4: Add missing contributor guides

- create an architecture doc maintenance guide:
  "what to update when runtime behavior changes"
- create an architecture reading-path guide:
  "which doc to read for principle, current truth, and supporting context"
- create a doc taxonomy guide for `canonical` versus `status` versus
  `historical` architecture surfaces if existing guidance remains too implicit

### Wave 5: Close with governed navigation and validation

- regenerate docs indexes after each structural move
- keep workboard/lane tracking aligned with the plan
- record final archive moves and replacements explicitly

## Non-Goals

- rewriting every package-level architecture document in one pass
- replacing ADRs or contracts with status pages
- preserving every historical architecture note in the active tree
- keeping multiple repository-wide maps alive when one canonical map is enough

## Execution Batches

### Batch A: Inventory and classification

- produce a file-by-file architecture surface inventory
- mark keep/update/archive candidates
- define the final active reading path

### Batch B: Active truth correction

- update canonical and status pages first
- fix broken domain references and stale cross-links
- make supporting docs explicitly non-authoritative where needed

### Batch C: Simplification and archive moves

- move superseded snapshots out of active surfaces
- collapse duplicate indexes and diagrams
- remove obsolete references from active pages

### Batch D: Guide creation and closeout

- publish the contributor guides
- confirm the canonical architecture navigation path is stable
- validate links, generated indexes, and prepush baseline

## Validation Baseline

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm verify:prepush`

## Exit Criteria

- no active architecture index points to missing proposal files
- no active repository-wide architecture page contradicts
  [System Delivery Status](../../architecture/system-delivery-status.md) on
  already shipped behavior
- one reader can distinguish `principles`, `current truth`, `supporting
diagrams`, and `historical snapshots` without guessing
- at least one contributor guide explains how to keep architecture docs aligned
  after runtime changes
