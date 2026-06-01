---
title: Planner Local ADR-0004 Security Guardrails Via Limits
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0004: Security Guardrails via Limits

Archived from `packages/@dvt/planner/docs/adr/ADR-0004-security-limits.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- Planner enforces configurable limits:
  - maxNodes, maxEdges, maxDepth, maxPlanSizeBytes, timeoutMs

Rationale:

- Protects planner against hostile or accidental oversized inputs.
- Ensures predictable resource usage.
