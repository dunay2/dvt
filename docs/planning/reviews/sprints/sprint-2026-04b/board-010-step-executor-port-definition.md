---
title: SPR-2026-04B-010 Step Executor Port Definition
status: Blocked
owner: Execution Runtime
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04B-010
sprint: 2026-04B
execution_status: blocked
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-28
domain: execution-runtime
linked_task_ids:
  - none
blocked_by:
  - board-007
source_reviews:
  - ../../../../reviews/architectural-review-dvtplus-2026-03-24.md
---

# Board Story

As an adapter engineer, I want a formal `IStepExecutor` port, so that SQL step
execution is governed by a clear boundary instead of implicit activity logic.

# Needs

- contract for execute/canExecute behavior
- clear error mapping model for terminal vs transient failures
- adapter compatibility strategy for current Temporal execution path

# Invariants

- engine remains runtime-agnostic
- step execution errors are observable and typed
- no direct infrastructure coupling leaks into planner contracts
