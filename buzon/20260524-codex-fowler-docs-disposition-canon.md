---
title: Fowler analysis - Docs disposition canon
status: Active
owner: Architecture / Docs / Planning
last_reviewed: 2026-05-24
---

# Fowler Analysis - Docs Disposition Canon

## Fowler Analysis

The active smell was not missing effort; it was queue ambiguity. The repository
had a high-signal status inventory from 2026-05-10 and a Planning DB
`docs-disposition` rail, but the status document still read like an open
backlog after the DB queue had resolved rows.

The Fowler interpretation is a boundary correction:

- replace status-snapshot-as-workboard with a Planning DB query rail;
- classify task-like identifiers by semantic family before creating work;
- keep document moves behind focused commands with owner and evidence checks;
- preserve historical status evidence while adding a current canonical
  disposition note.

## Mature-System Comparison

Mature documentation systems keep three surfaces separate:

- inventory snapshots that explain what was found;
- operational queues that own state and resolution;
- component contracts that define how future findings are classified.

This slice moves DVT toward that model. The inventory remains a dated status
artifact, while `ClassifyDocsDispositionClosure` and
`ResolveDocsDispositionQueue` name the semantic API for ongoing work.

## Improved Patterns

- Planning DB remains the operational source for disposition state.
- Draft, Superseded, and task-like findings are linked rather than blindly
  rewritten.
- A component guide now owns public API, invariants, transitions, consumers,
  and semantic fitness tests.
- The domain page records that no open parallel docs backlog remains.

## Antipatterns

- Status snapshot drift: old counts can be misread as live execution work.
- Label-driven cleanup: moving files only because they say Draft or Superseded.
- Identifier overloading: treating every uppercase token as a planning task.
- Hidden workboard: tracking unresolved work in prose instead of Planning DB.

## Drift

Code drift was not present in runtime code. Documentation drift existed between
the 2026-05-10 inventory posture and the current `docs-disposition` query
result: open rows are empty, while resolved rows are linked.

The fix is a canonical disposition note and semantic guard, not a batch rewrite
of historical documents.

## Applied Pattern

- Command/query rail: `ResolveDocsDispositionQueue` and
  `ClassifyDocsDispositionClosure`.
- DDD ownership: `DocsDispositionCanon` aggregate and
  `DocsDispositionClosure` read model.
- Semantic fitness function: `tools/ci/docs-disposition-canon.test.mjs`.
- Explicit component guide: public API, invariants, transitions, consumers, and
  diagrams.

## Opportunities

- Future work can add a generated allowlist for non-task identifier classes.
- Focused follow-ups can archive individual superseded proposals when backlink
  evidence is available.
- Review canon tasks can apply the same linked/open distinction to remaining
  review surfaces.
