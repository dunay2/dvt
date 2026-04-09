---
title: SPR-2026-04A-006 Review Link Stability Hardening
status: In Progress
owner: Docs Governance
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04A-006
sprint: 2026-04A
execution_status: in_progress
execution_progress_pct: 60
created_on: 2026-04-02
target_date: 2026-04-08
domain: documentation-governance
linked_task_ids:
  - none
blocked_by:
  - none
source_reviews:
  - ../../review-status-board.md
---

# Board Story

As a documentation maintainer, I want review references to remain stable after
taxonomy migrations, so that planning, ADR, risk, and evidence links do not break
when reviews are regrouped or archived.

# Needs

- link updates on all canonical planning surfaces
- explicit archive index for superseded review families
- single active board entrypoint for review execution status

# Invariants

- active versus historical review classification remains explicit
- generated docs surfaces remain clean after sync
- no duplicate parallel navigation trees

# Next Verification

- link scan across `docs/` for legacy review paths
- docs sync regeneration and prepush baseline
