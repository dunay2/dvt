---
title: Roadmap Of Record
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-09-10
---

# Roadmap Of Record

This page is the canonical roadmap entry point for repository-wide planning.
It explains durable product direction and sequencing. It is not a task queue,
status board, or architecture authority.

## Authority Boundary

- Task identity, priority, assignment, status, blockers, acceptance, and closure:
  GitHub Issues.
- Implementation review and integration: GitHub pull requests.
- Architecture, components, capabilities, relations, command/query rails,
  feature mechanization, and governed architecture evidence: Planning DB.
- Executable truth: code, contracts, tests, and CI on `main`.
- Durable repository-wide sequencing: this roadmap and its classified subsystem
  roadmaps.

See
[ADR-0061](../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
for the task/architecture boundary.

## Canonical Planning Surfaces

- Active task lifecycle: [GitHub Issues](https://github.com/dunay2/dvt/issues).
- Roadmap of record: this page.
- Strategic product direction:
  [Strategic Product Roadmap](strategic-product-roadmap.md).
- Current implementation state:
  [System Delivery Status](../../architecture/system-delivery-status.md).
- Delivery procedure:
  [GitHub MVP Issue Workflow](../state/github-mvp-issue-workflow.md).
- Governance startup router:
  [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md).

No control tower, dashboard, lane file, workboard, task row, or generated planning
view is a planning authority.

## Document Classification

- `docs/planning/roadmap/index.md`
  Classification: canonical roadmap of record.
- `docs/planning/roadmap/strategic-product-roadmap.md`
  Classification: strategic roadmap overlay.
- `docs/architecture/system-delivery-status.md`
  Classification: current implementation status.
- `docs/planning/status/*`
  Classification: generated or curated status/evidence.
- `docs/planning/gaps/*`
  Classification: tactical gap registers; closed programs must not remain active
  controls.
- `docs/planning/proposals/**`
  Classification: scoped proposals/delivery plans, not repository-wide task
  authority.
- `docs/planning/archive/**` and historical closeouts/reviews
  Classification: historical evidence only unless a current authority explicitly
  promotes a specific fact.

## Operating Rules

- Do not create a new roadmap when a status update or GitHub issue is enough.
- Do not use a subsystem roadmap as the repository-wide roadmap of record.
- Do not use status snapshots as future-planning artifacts.
- Do not represent task lifecycle in roadmap files.
- Delete obsolete roadmap aliases and retired planning hubs instead of preserving
  compatibility entry points.
- When a durable repository-wide sequencing decision changes, update this page
  and link to the governing issue/ADR/evidence instead of creating a parallel
  planning surface.

## Current Reading Order

1. [System Delivery Status](../../architecture/system-delivery-status.md) for
   current implementation truth.
2. [GitHub Issues](https://github.com/dunay2/dvt/issues) for active work.
3. This roadmap for durable sequencing.
4. [Strategic Product Roadmap](strategic-product-roadmap.md) for multi-quarter
   direction.
5. [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)
   before governance or architecture changes.
6. Relevant domain/subsystem proposals only when the task requires their scope.

## Domain And Diagram Navigation

- [Planning Domains](../domains/index.md)
- [Planning State](../state/index.md)
- [Planning Roadmap Diagrams](./diagrams/index.md)
- [Planning Domain Map](./diagrams/planning-domain-map.md)
- [Roadmap By Domain](./roadmap-by-domain.md)

## Maintenance Rule

If a new roadmap-like file is created, classify it here as one of:

- canonical roadmap;
- strategic overlay;
- subsystem roadmap/delivery plan;
- status/evidence artifact;
- archived historical plan.

A new planning hub or control tower is not a valid classification.
