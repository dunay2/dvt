---
title: SPR-2026-04A-005 Diff Semantics Consistency
status: Queued
owner: CI / Tooling
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04A-005
sprint: 2026-04A
execution_status: queued
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-11
domain: ci-and-delivery
linked_task_ids:
  - none
blocked_by:
  - board-004
source_reviews:
  - ../../../../ci-and-delivery/20260330-ci-prepush-pr-process-observations.md
---

# Board Story

As a CI maintainer, I want pre-push and changed-file scripts to use consistent
diff semantics, so that validation scope does not silently drift on non-linear
history.

# Needs

- unified baseline strategy for `..` versus `...` usage
- documented fallback behavior for first-push or shallow histories
- regression checks for scope-detection scripts

# Invariants

- no reduction in validation coverage
- first-push behavior must fail safe, not fail open
- GitHub workflow assumptions remain compatible

# Next Verification

- unit tests for scope command resolution
- manual verification on both linear and merge-base scenarios
