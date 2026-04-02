---
title: SPR-2026-04B-008 Observability Hash Decoupling
status: Blocked
owner: Planner / Architecture
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04B-008
sprint: 2026-04B
execution_status: blocked
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-24
domain: planner-and-contracts
linked_task_ids:
  - none
blocked_by:
  - board-007
source_reviews:
  - ../../../../reviews/architectural-review-dvtplus-2026-03-24.md
---

# Board Story

As a planner maintainer, I want plan identity hashing decoupled from
observability metadata, so that changing tags does not create false new plan
identities.

# Needs

- explicit semantic hash scope definition
- migration path for existing plan readers
- regression test for stable plan hash under observability edits

# Invariants

- `planId` remains content-addressed and verifiable
- semantic plan changes still produce new hashes
- observability fields remain available to consumers
