---
title: Post-Merge Planning Closeout Drift Problem
status: Superseded
owner: Architecture / Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
superseded_by: docs/adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md
archived_record: docs/planning/archive/proposals/post-merge-planning-closeout-drift-problem-20260508.md
---

# Post-Merge Planning Closeout Drift Problem

This proposal no longer defines local Planning DB task queries or closeout
commands. GitHub Issues own MVP work status and administrative closure; pull
requests own implementation review and merge state. The Planning DB must not
project a second task backlog or task lifecycle.

The former proposal is preserved only as an explicit historical record at the
`archived_record` path above.
