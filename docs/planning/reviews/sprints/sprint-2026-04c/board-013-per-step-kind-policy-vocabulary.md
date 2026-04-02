---
title: SPR-2026-04C-013 Per-Step-Kind Policy Vocabulary
status: Blocked
owner: Planner / Contracts
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04C-013
sprint: 2026-04C
execution_status: blocked
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-05-07
domain: planner-and-contracts
linked_task_ids:
  - none
blocked_by:
  - board-007
  - board-008
source_reviews:
  - ../../../../reviews/dvt_planner_technical_vision.md
---

# Board Story

As a workflow designer, I want policy classes that can vary by step kind, so
that models, tests, and operations can use differentiated retry and timeout
behavior.

# Needs

- contract shape for per-step-kind policy resolution
- compatibility mapping for existing global policy set
- deterministic merge rules for defaults and overrides

# Invariants

- policy resolution remains deterministic
- runtime-neutral vocabulary remains intact
- adapter translation remains explicit
