---
title: Planner Local ADR-0003 Typed Error Taxonomy
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0003: Typed Error Taxonomy

Archived from `packages/@dvt/planner/docs/adr/ADR-0003-typed-errors.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- All errors thrown by planner MUST be `PlannerError`.
- `PlannerErrorCode` enumerates error categories.

Rationale:

- Deterministic handling in orchestrator.
- Avoid brittle string matching and stage inference.
