---
title: G5 Outbox Worker Focused Review Pack
status: Draft
owner: docs
last_reviewed: 2026-03-08
scope: focused-topics-only
---

# G5 Outbox Worker Focused Review Pack

This pack addresses **only** the topics raised in the latest review round:

1. polling / CDC coexistence is too restrictive,
2. secret handling and injection remains vague,
3. `DeliveryOutcomeDecider` still owns backoff computation,
4. crash-window testing is named but not concretely specified,
5. ordering lanes may be over-designed,
6. document fragmentation should be reduced,
7. naming should be unified,
8. operations guidance should exist.

This pack does **not** reopen unrelated areas such as worker migration, branded types,
or broad package decomposition. Those topics belong to other review threads.

## Outcomes fixed in this pack

- Replace the old rule **"exactly one production-active mechanism per (environment, topic)"**
  with a more precise rule based on **delivery channel** and **side effect ownership**.
- Clarify that the worker core does **not** resolve secrets. The host resolves secrets and
  injects already-materialized adapters/config into the runtime.
- Split backoff calculation out of `DeliveryOutcomeDecider` into `IBackoffCalculator`.
- Define a concrete crash-window test strategy with deterministic fault injection.
- Compare two lane designs and explicitly choose one for G5.x.
- Merge tiny documents into fewer, denser specs.
- Standardize the term **outbox record** across the pack.
- Add an operations document that covers monitoring, alerts, replay, and incident handling.

## Pack structure

- `G5_OUTBOX_WORKER_FOCUSED_TOPICS_FULL_REVIEW.md`
- `docs/adr/ADR-G5-002-focused-topics-addendum.md`
- `docs/specs/SPEC-G5-COEXISTENCE-SECRETS-AND-TYPES.md`
- `docs/specs/SPEC-G5-DELIVERY-OUTCOME-BACKOFF.md`
- `docs/architecture/ARCH-G5-ORDERING-LANES-AND-RUNTIME.md`
- `docs/quality/QUALITY-G5-CRASH-WINDOW-AND-TESTING.md`
- `docs/operations/OPS-G5-OUTBOX-WORKER.md`

## Source references used

- PostgreSQL `SELECT ... FOR UPDATE ... SKIP LOCKED`
- PostgreSQL `LISTEN/NOTIFY`
- Debezium Outbox Event Router
- `p-limit`
- OpenTelemetry JS
- Prometheus client library guidance
