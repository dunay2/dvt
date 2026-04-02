---
title: SPR-2026-04B-007 Typed CompiledCodeRef Contract
status: Queued
owner: Planner / Contracts
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04B-007
sprint: 2026-04B
execution_status: queued
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-22
domain: planner-and-contracts
linked_task_ids:
  - none
blocked_by:
  - none
source_reviews:
  - ../../../../reviews/architectural-review-dvtplus-2026-03-24.md
---

# Board Story

As a workflow-runtime engineer, I want `compiledCodeRef` represented as a typed
step contract field, so that planner-to-adapter handoff is compile-time safe and
not hidden in opaque config maps.

# Needs

- typed placement of `compiledCodeRef` in step contracts
- compatibility strategy for existing readers
- tests proving extraction without key-name coupling

# Invariants

- plan determinism remains stable
- contract compatibility policy is preserved
- no runtime-specific leakage into shared kernel
