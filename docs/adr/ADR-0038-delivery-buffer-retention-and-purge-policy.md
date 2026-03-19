---
title: ADR-0038 - Delivery Buffer Retention and Purge Policy
status: Accepted
owner: Architecture / Delivery / Operations
last_reviewed: 2026-03-19
---

# ADR-0038 - Delivery Buffer Retention and Purge Policy

## Status

Accepted.

## Context

DVT stores authoritative run history in `run_events`, but also maintains
delivery-oriented buffers such as:

- `outbox`
- `outbox_dead_letter`
- `lineage_outbox`
- `lineage_dead_letter`

Those tables are operational machinery, not canonical workflow history.

Treating them as if they had the same lifecycle as `run_events` would blur
authority and create unnecessary long-lived storage pressure.

## Decision

### 1. Delivery buffers have a separate lifecycle from event history

`outbox` and dead-letter tables are not authoritative run history.

Therefore:

- they have independent retention policies
- they may be physically deleted after policy conditions are met
- their lifecycle MUST NOT govern `run_events`

### 2. Purge eligibility is explicit and machine-checkable

Minimum purge eligibility rules are:

- delivered outbox row:
  - `delivered_at IS NOT NULL`
  - older than configured retention window
- outbox dead-letter row:
  - older than configured retention window
  - not under investigation hold, if holds exist
- lineage delivered row:
  - terminally delivered or acknowledged by its owning delivery flow
- lineage dead-letter row:
  - older than configured retention window
  - not under investigation hold, if holds exist

### 3. Default retentions are intentionally shorter than event-history retention

Default operating posture:

- delivered outbox: `7` days
- outbox dead letter: `30` days
- lineage delivered buffer: short retention
- lineage dead letter: `30` days

Environment-specific overrides are allowed, but the defaults must stay clearly
shorter than `run_events` hot retention.

### 4. Purge jobs are batch-based, repeatable, and observable

Delivery-buffer purge must run as:

- repeatable batch jobs
- idempotent operations
- policy-driven cleanup

Mandatory observability:

- retained row counts
- purged row totals
- purge failures

### 5. Purge must honor investigation holds if present

If investigation holds or equivalent operator protections exist, purge MUST
respect them.

No delivery-buffer purge may bypass an explicit hold state.

## Consequences

### Positive

- Keeps authoritative event history and delivery machinery clearly separated.
- Prevents outbox and dead-letter tables from becoming long-lived accidental
  archives.
- Gives operators clear, automatable cleanup rules.

### Negative

- Requires buffer-specific purge jobs and observability.
- Dead-letter retention still needs disciplined operator review before rows age
  out.

## Related

- [ADR-0004-event-sourcing-strategy.md](ADR-0004-event-sourcing-strategy.md)
- [ADR-0009_Outbox_Ordering.md](ADR-0009_Outbox_Ordering.md)
- [ADR-0033-outbox-worker-sharding-and-fencing-model.md](ADR-0033-outbox-worker-sharding-and-fencing-model.md)
- [gap-5-pr3-delivery-buffer-retention-20260319.md](../planning/proposals/gap-5-pr3-delivery-buffer-retention-20260319.md)
