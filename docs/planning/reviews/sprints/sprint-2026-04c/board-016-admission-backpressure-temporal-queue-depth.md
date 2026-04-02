---
title: SPR-2026-04C-016 Admission Backpressure For Temporal Queue Depth
status: Blocked
owner: Runtime Safety
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04C-016
sprint: 2026-04C
execution_status: blocked
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-05-15
domain: runtime-safety-and-admission
linked_task_ids:
  - none
blocked_by:
  - board-003
source_reviews:
  - ../../../../reviews/architectural-review-dvtplus-2026-03-24.md
---

# Board Story

As an admission-control owner, I want queue-depth-aware backpressure before
start-run acceptance, so that the system rejects overload early instead of
creating delayed runtime collapse.

# Needs

- queue depth probe contract and implementation
- admission policy threshold semantics
- caller-facing overload response contract

# Invariants

- tenant authorization order remains unchanged
- existing DB-backed admission checks stay active
- observability and alerting include overload signals
