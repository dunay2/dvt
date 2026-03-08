---
title: Roadmap Of Record
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-03-08
---

# Roadmap Of Record

This page is the canonical roadmap entry point for repository-wide planning.

Use this page to understand which planning surface is authoritative, which
documents are status boards, and how roadmap-shaped material must be classified
or removed instead of competing with the active planning surface.

Concept anchors for this page:

- [Glossary](../../concepts/glossary.md) for `roadmap`, `status`, and
  `canonical spec`
- [Domain Language](../../concepts/domain-language.md) for the rule that one
  roadmap of record must not compete with status docs or subsystem plans

## Canonical Planning Surfaces

- Roadmap of record: this page
- Current implementation state:
  [System Delivery Status](../../architecture/system-delivery-status.md)
- Current planning hub: [Planning](../index.md)
- Current generated status:
  [Planning Status](../status/index.md)
- Current gap tracking:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)

## Document Classification

| Document | Classification | Use it for |
| --- | --- | --- |
| `docs/planning/roadmap/index.md` | Canonical roadmap of record | Repository-wide planning entry point |
| `docs/architecture/system-delivery-status.md` | Status board | What is true now in implementation |
| `docs/planning/status/*` | Generated or curated status | Measured status and traceability artifacts |
| `docs/planning/gaps/*` | Execution-gap tracking | Concrete delivery gaps and work breakdown |
| `docs/architecture/engine/roadmap/engine-phases.md` | Subsystem roadmap | Engine-specific phase planning |

## Operating Rules

- Do not create a new roadmap document when a status update is enough.
- Do not use a subsystem roadmap as the repository-wide roadmap of record.
- Do not use status snapshots as future-planning artifacts.
- Delete obsolete roadmap aliases instead of preserving them as parallel entry
  points.
- When in doubt, update this page and link outward instead of creating another
  parallel planning surface.

## Current Planning Direction

Repository-wide planning should currently be read in this order:

1. [System Delivery Status](../../architecture/system-delivery-status.md)
2. [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)
3. [Planning Status](../status/index.md)
4. Relevant proposals under [Planning Proposals](../proposals/index.md)

## Maintenance Rule

If a new roadmap-like file is created, it must be classified here as one of:

- canonical roadmap;
- subsystem roadmap;
- status artifact;
- archived historical plan.
