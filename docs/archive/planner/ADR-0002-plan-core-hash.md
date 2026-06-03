---
title: Planner Local ADR-0002 PlanCore Hash Boundary
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0002: planCore Hash Boundary

Archived from `packages/@dvt/planner/docs/adr/ADR-0002-plan-core-hash.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- Define `planCore` as the only object hashed to generate planId.
- Return `canonicalPlanCoreJson = JCS(planCore)`.

Rationale:

- Guarantees caller-verifiable plan identity.
- Allows post-hash provenance fields without changing planId.
