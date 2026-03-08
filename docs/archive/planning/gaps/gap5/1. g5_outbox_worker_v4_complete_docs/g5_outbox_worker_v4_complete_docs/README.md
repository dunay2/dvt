---
title: G5 Outbox Worker Independent — Complete Documentation Pack v4
status: Draft for review
owner: architecture
last_reviewed: 2026-03-08
---

# G5 Outbox Worker Independent — Complete Documentation Pack v4

This pack supersedes the previous draft sets by doing three things at once:

1. preserving the **v2** and **v3** review history,
2. adding the **missing concrete specifications**,
3. making the migration path from the current in-engine worker explicit.

## Included documents

### Archive
- `00-archive/G5_OUTBOX_WORKER_V2_FULL_REVIEW.md`
- `00-archive/G5_OUTBOX_WORKER_V3_FULL_REVIEW.md`

### ADR
- `01-adr/ADR-G5-001-independent-outbox-worker-v4.md`

### Specifications
- `02-spec/SPEC-OUTBOX-DELIVERY-CONTRACTS.v4.md`
- `02-spec/SPEC-OUTBOX-RUNTIME-CONTRACTS.v1.md`
- `02-spec/SPEC-OUTBOX-ORDERING-LANES.v1.md`
- `02-spec/SPEC-OUTBOX-IDEMPOTENCY.v1.md`
- `02-spec/SPEC-OUTBOX-TYPES-POLICY.v1.md`

### Architecture
- `03-architecture/ARCH-OUTBOX-RUNTIME.v4.md`
- `03-architecture/ARCH-OUTBOX-CDC-COEXISTENCE.v1.md`
- `03-architecture/ARCH-OUTBOX-POLLING-SQL.v1.md`

### Class design
- `04-class-design/CLASS-DESIGN-OUTBOX-WORKER.v2.md`

### Quality
- `05-quality/QUALITY-OUTBOX-WORKER.v2.md`

### Security
- `06-security/SECURITY-OUTBOX-WORKER.v2.md`

### Migration
- `07-migration/MIGRATION-PLAN-EXISTING-OUTBOX-WORKER.v1.md`

### Roadmap
- `08-roadmap/ROADMAP-G5_OUTBOX_WORKER.v4.md`

## Baseline alignment with DVT+

This pack assumes the same non-negotiable product split already stated in the
project material:

- the UI does not execute,
- the engine does not decide,
- the planner does not persist state,
- persistent state remains the source of truth,
- execution backends remain replaceable behind explicit boundaries.

That means G5 is treated as a delivery/runtime concern, not as planner logic and
not as UI logic.

## Core position in one page

### What is decided now

- The current outbox logic must be extracted into a **standalone worker process**.
- The production MVP delivery family is **polling with transactional claims**.
- Claiming remains based on PostgreSQL row locking and leases.
- The polling runtime is for **DVT-controlled subscribers**.
- CDC is real and useful, but it is a **second delivery family**, not a hidden
  implementation detail behind the polling store contract.
- The worker provides **at-least-once** delivery only.
- Subscriber-side idempotency is therefore mandatory.
- Ordering is **not global**. When needed, it is provided through **ordering
  lanes**.

### What is explicitly not claimed

- no exactly-once delivery,
- no global total order,
- no magical one-core-abstraction for both polling and CDC,
- no dual-active polling and CDC for the same topic in production.

## How to read this pack

Start with:

1. ADR,
2. delivery contracts,
3. runtime architecture,
4. migration plan,
5. polling SQL,
6. ordering/idempotency specs.

The archive copies are kept only so that review history is not lost.
