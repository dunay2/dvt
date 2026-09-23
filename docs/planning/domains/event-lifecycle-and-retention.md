---
title: Domain - Event Lifecycle And Retention
status: Review
owner: Engine / Adapters / Docs
last_reviewed: 2026-09-10
planning_type: reference
---

# Domain - Event Lifecycle And Retention

Planning surfaces for archival lifecycle, delivery buffer retention, restore
flows, and operational lifecycle governance.

## Canonical Sources

- [Architecture Surface Inventory](../../architecture/architecture-surface-inventory-20260402.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)

## Current Lifecycle Status

- Deferred deletion and restore are implemented through the archive lifecycle
  ports and Postgres archive store.
- Cold archive export redacts sensitive payload fields by default before writing
  object-store artifacts.
- Regulated erasure, legal approval, and audit workflows remain separate
  governance obligations; sensitive-field redaction does not close them.

## Active Planning Inputs

- [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md)
- [CI Retention Review Canon Plan 2026-05-23](../proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md)

## Relevant Reviews And Closeouts

- [AR-D5 tenant-configurable retention policy closeout](../closeouts/20260522-ar-d5-tenant-configurable-retention-policy-closeout.md)

## Review Canon

Event-retention reviews are rationale and evidence, not independent policy
owners. `D-REV-CI-RETENTION-CANON` routes retention review findings through the
`ClassifyCiRetentionReviewDisposition` query and the
`RecordCiRetentionReviewCanon` command before implementation. Use these local
guides for public API, invariants, transitions, consumers, and semantic guard
expectations:

- [CI retention review canon component](../../architecture/components/ci-governance/ci-retention-review-canon-component.md)
- [CI retention review canon user stories](../../architecture/components/ci-governance/ci-retention-review-canon-user-stories.md)
- [Run event retention policy component](../../architecture/components/engine/adapters/state-store/postgres/run-event-retention-policy-component.md)

## Diagram Sources

- [Event Lifecycle and Retention Architecture Delta](../roadmap/diagrams/event-lifecycle-retention-architecture-delta.md)
