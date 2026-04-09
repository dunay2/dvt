---
title: SPR-2026-04A-002 Event Payload Versioning
status: Queued
owner: Contracts / Lineage
last_reviewed: 2026-04-02
planning_type: review
board_id: SPR-2026-04A-002
sprint: 2026-04A
execution_status: queued
execution_progress_pct: 0
created_on: 2026-04-02
target_date: 2026-04-14
domain: event-contract-and-traceability
linked_task_ids:
  - S05
blocked_by:
  - board-001
source_reviews:
  - ../../../../architecture-and-governance/20260326-dvt-principal-architectural-review.md
---

# Board Story

As a platform integrator, I want event payloads to be versioned and validated by
event type, so that contract evolution does not silently break projector,
lineage, or delivery consumers.

# Needs

- explicit `payloadVersion` on event inputs
- schema validation at write boundaries by event type
- migration path for existing event consumers

# Invariants

- append-only event log behavior is preserved
- idempotency constraints are not weakened
- tenant-scoped query behavior remains unchanged

# Next Verification

- contract tests for valid and invalid payload versions
- negative-path tests for schema rejection
