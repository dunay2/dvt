---
title: ADR-G5-002 Focused Topics Addendum
status: Proposed
owners: Core Architecture
date: 2026-03-08
---

# ADR-G5-002 — Focused Topics Addendum

## Context

The previous G5 documents left unresolved questions in a narrow but important set of areas:

- coexistence of polling and CDC,
- secret handling boundary,
- backoff responsibility placement,
- crash-window testing,
- ordered lane design,
- operations readiness.

This ADR decides only those topics.

## Decision

### D1. Coexistence policy

Polling and CDC may coexist for the same domain topic **only when they do not own the same side effect**.

Normative rule:

> For a given `(environment, topic, delivery_channel, side_effect_class)` tuple, there must be exactly one production-active owner.

### D2. Secrets boundary

The worker core does not fetch or rotate secrets.

Secrets are resolved by the host process, which constructs authenticated adapters and injects ready-to-use dependencies into the runtime.

### D3. Backoff separation

`DeliveryOutcomeDecider` must not own retry timestamp calculation.
`IBackoffCalculator` is required whenever retry scheduling is enabled.

### D4. Ordered lanes

G5.x supports two execution modes:

- unordered mode,
- ordered mode with a dedicated lane lease table.

Ordered mode guarantees serial processing per lane only.

### D5. Crash-window quality gate

The delivery stack must expose a deterministic fault injection point after subscriber success and before store acknowledgment write.

### D6. Naming

The canonical term is **outbox record**.

## Consequences

- Hybrid topologies become possible without duplicating side effects.
- The worker core stays simpler and more testable.
- Retry policy becomes easier to test in isolation.
- Ordered delivery is explicit and observable, at the cost of an extra table.
- Crash-window behavior becomes testable rather than theoretical.

## Non-decisions

This ADR does not decide:

- worker migration strategy,
- branded type policy across the whole repository,
- whether CDC should become default in a future generation.

Those topics belong to separate decisions.
