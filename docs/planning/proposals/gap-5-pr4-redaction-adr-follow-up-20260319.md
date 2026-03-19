---
title: Gap 5 PR4 Redaction ADR And Follow-Up
status: Review
owner: Architecture
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 5 PR4 Redaction ADR And Follow-Up

## Goal

Handle regulated erasure as a separate, explicitly governed follow-up to Gap 5.

## Machine Coordination Header

```yaml
parent_plan: gap-5-event-lifecycle-and-archival-design-20260319
pr_split_id: G5-PR4
scope_type: executable_slice
depends_on:
  - G5-PR1
  - G5-PR2
  - G5-PR3
blocks: []
```

## In Scope

- ADR for redaction and legal-policy constraints
- request and audit model
- compatibility story for archived objects
- selected implementation path once ADR is accepted

## Out Of Scope

- minimal archival
- restore and delete-after-grace
- delivery-buffer retention

## Deliverables

1. Accepted ADR for redaction semantics.
2. Audit model for redaction requests and approvals.
3. Chosen technical mechanism for hot and cold data.
4. Test strategy proving archive compatibility.

## Technical Minimum Spec

The ADR must decide at least:

- whether hot-store redaction is projection-level, physical rewrite, or hybrid
- whether cold archive files are rewritten, superseded, or left immutable with
  catalog-level masking
- required audit fields:
  - requester
  - approver
  - legal basis
  - affected scope
  - executed_at
  - execution result

No PR before `G5-PR4` should hard-code a redaction-specific schema that would
pre-decide these answers.

## Acceptance Conditions

- ADR defines whether redaction is projection-level, file-rewrite, or hybrid
- archive compatibility is explicit
- audit trail is mandatory
- machine-readable request and resolution states are documented

## Checklist

| Item                               | Status  | Notes |
| ---------------------------------- | ------- | ----- |
| Redaction ADR written              | pending |       |
| Legal-policy review complete       | pending |       |
| Audit model defined                | pending |       |
| Cold archive compatibility defined | pending |       |
| Implementation path chosen         | pending |       |
| Tests and evidence defined         | pending |       |

## PR Resolution Table

| PR ID    | Planned status | Actual PR | Resolution | Notes                       |
| -------- | -------------- | --------- | ---------- | --------------------------- |
| `G5-PR4` | proposed       | pending   | open       | redaction ADR and follow-up |
