---
title: SPEC G5 — Coexistence And Naming Addendum
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# SPEC G5 — Coexistence And Naming Addendum

## 1. Rename

`sideEffectClass` is renamed to `sideEffectKind`.

Reason:

- `class` is overloaded and may be read as an object-oriented construct,
- `kind` communicates category without implying inheritance or runtime type systems.

## 2. Ownership tuple

The production ownership tuple is:

`(environment, topic, deliveryChannel, sideEffectKind)`

## 3. Ownership rule

Exactly one production-active owner is permitted for a given tuple.

A topic may still have multiple owners overall if each owner controls a different `sideEffectKind`.

## 4. Canonical examples

### Allowed

| environment | topic               | deliveryChannel      | sideEffectKind      | owner          |
| ----------- | ------------------- | -------------------- | ------------------- | -------------- |
| prod        | workflow.run.events | internal_projection  | snapshot_projection | polling worker |
| prod        | workflow.run.events | internal_projection  | cache_refresh       | polling worker |
| prod        | workflow.run.events | external_publication | kafka_publish       | CDC relay      |

### Forbidden

| environment | topic               | deliveryChannel     | sideEffectKind      | owner            |
| ----------- | ------------------- | ------------------- | ------------------- | ---------------- |
| prod        | workflow.run.events | internal_projection | snapshot_projection | polling worker A |
| prod        | workflow.run.events | internal_projection | snapshot_projection | polling worker B |

## 5. Naming policy

Use `outbox record` in prose, code comments, specs, logs, and metrics help text.
