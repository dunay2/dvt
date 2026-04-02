---
title: SPR-2026-04A-004 Lint-Staged Script Coverage
status: Queued
owner: CI / Tooling
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04A-004
sprint: 2026-04A
execution_status: queued
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-10
domain: ci-and-delivery
linked_task_ids:
  - none
blocked_by:
  - none
source_reviews:
  - ../../../../ci-and-delivery/20260330-ci-prepush-pr-process-observations.md
---

# Board Story

As a contributor, I want staged files under `scripts/` to be linted and formatted
in pre-commit, so that script regressions are caught consistently before push.

# Needs

- `lint-staged` patterns that include `scripts/**/*.{js,cjs,mjs}`
- parity with existing changed-file quality checks
- predictable local hook behavior

# Invariants

- pre-commit remains deterministic and non-interactive
- no scope reduction on existing lint-staged patterns
- hook runtime stays practical for normal commit size

# Next Verification

- local commit hook execution on staged script changes
- changed-file gate remains green in CI
