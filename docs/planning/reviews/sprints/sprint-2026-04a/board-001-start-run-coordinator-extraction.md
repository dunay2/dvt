---
title: SPR-2026-04A-001 StartRun Coordinator Extraction
status: Review
owner: Runtime Architecture
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04A-001
sprint: 2026-04A
execution_status: in_review
execution_progress_pct: 35
created_on: 2026-04-02
target_date: 2026-04-12
domain: execution-runtime
linked_task_ids:
  - S03
blocked_by:
  - none
source_reviews:
  - ../../../../execution-runtime/20260326-s03-hard-qa-review.md
  - ../../../../architecture-and-governance/20260326-dvt-principal-architectural-review.md
---

# Board Story

As a runtime maintainer, I want `startRun` orchestration extracted into a dedicated
coordinator, so that authorization, admission, intent handling, and dispatch are
separated from engine-domain behavior.

# Needs

- explicit orchestration boundary with small, testable responsibilities
- lower coupling between domain engine logic and app-service concerns
- cleaner path to formal `IAuthorizationPolicy` extraction

# Invariants

- engine lifecycle authority remains in DVT runtime boundaries
- no tenant-scope authorization bypass is introduced
- existing start-run contract behavior remains backward-compatible

# Next Verification

- package-level runtime tests covering start-run happy and negative paths
- explicit validation of authorization-before-planref ordering
