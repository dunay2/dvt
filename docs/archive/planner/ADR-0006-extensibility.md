---
title: Planner Local ADR-0006 Extensibility Model
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0006: Extensibility Model

Archived from `packages/@dvt/planner/docs/adr/ADR-0006-extensibility.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- StepKind is `string`.
- Step creation via injected `StepFactory`.
- Policies include `custom` passthrough without interpretation.

Rationale:

- Planner supports domains beyond dbt without modifying core.
- Keeps default dbt behavior via dbtStepFactory.
