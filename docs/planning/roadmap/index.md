---
title: Roadmap Of Record
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-04-03
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
- Current execution tracking:
  [Execution Workboard](../state/execution-workboard.md)

## Document Classification

- `docs/planning/roadmap/index.md`
  Classification: canonical roadmap of record
  Use it for: repository-wide planning entry point
- `docs/planning/archive/proposals/gap-5-executive-delivery-roadmap-20260319.md`
  Classification: archived subsystem roadmap
  Use it for: historical context only
- `docs/planning/archive/proposals/planner-target-state-roadmap-20260320.md`
  Classification: archived subsystem roadmap proposal
  Use it for: historical context only
- `docs/planning/proposals/mvp-backend-operability-baseline-roadmap-20260329.md`
  Classification: subsystem roadmap proposal
  Use it for: MVP backend operability baseline scope (`IN`/`OUT`) and consolidation lanes
- `docs/planning/proposals/frontend-roadmap-20260219.md`
  Classification: subsystem roadmap proposal
  Use it for: frontend convergence sequencing aligned with Lane E and the
  current UI architecture posture
- `docs/planning/roadmap/review-remediation-roadmap-20260402.md`
  Classification: subsystem roadmap
  Use it for: sprint-based execution sequencing of review findings and blockers
- `docs/architecture/system-delivery-status.md`
  Classification: status board
  Use it for: what is true now in implementation
- `docs/planning/status/*`
  Classification: generated or curated status
  Use it for: measured status and traceability artifacts
- `docs/planning/gaps/*`
  Classification: tactical gap registers
  Use it for: currently open, explicitly scoped deltas only; retire closed
  programs instead of carrying them as active controls
- `docs/architecture/engine/roadmap/engine-phases.md`
  Classification: subsystem roadmap
  Use it for: engine-specific phase planning

## Operating Rules

- Do not create a new roadmap document when a status update is enough.
- Do not use a subsystem roadmap as the repository-wide roadmap of record.
- Do not use status snapshots as future-planning artifacts.
- Delete obsolete roadmap aliases instead of preserving them as parallel entry
  points.
- Retire closed gap programs instead of preserving them as active planning
  controls.
- When in doubt, update this page and link outward instead of creating another
  parallel planning surface.

## Current Planning Direction

Repository-wide planning should currently be read in this order:

1. [System Delivery Status](../../architecture/system-delivery-status.md)
2. [Execution Workboard](../state/execution-workboard.md)
3. [Planning Status](../status/index.md)
4. Relevant proposals under [Planning Proposals](../proposals/index.md)

Current subsystem roadmaps worth consulting:

- [MVP Backend Operability Baseline Roadmap](../proposals/mvp-backend-operability-baseline-roadmap-20260329.md)
- [Frontend Roadmap - Prototype To Operational UI](../proposals/frontend-roadmap-20260219.md)
- [Roadmap By Domain](roadmap-by-domain.md)
- [Review Remediation Roadmap 2026-04](review-remediation-roadmap-20260402.md)

## Domain And Diagram Navigation

Use these surfaces for domain-first planning navigation and updated diagrams:

- [Planning Control Tower](../state/planning-control-tower.md)
- [Planning Domains](../domains/index.md)
- [Planning State](../state/index.md)
- [Open Task Route](../state/open-task-route.md)
- [Execution Workboard](../state/execution-workboard.md)
- [Planning Roadmap Diagrams](diagrams/index.md)
- [Planning Domain Map](diagrams/planning-domain-map.md)

## Maintenance Rule

If a new roadmap-like file is created, it must be classified here as one of:

- canonical roadmap;
- subsystem roadmap;
- status artifact;
- archived historical plan.
