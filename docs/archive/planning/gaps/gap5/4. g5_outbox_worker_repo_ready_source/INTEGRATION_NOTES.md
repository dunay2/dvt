---
title: G5 Outbox Worker Integration Notes
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Integration Notes

## Intended repo placement

```text
packages/
  @dvt/
    outbox-worker/
```

## Integration expectations

1. Keep secret resolution in the host composition root.
2. Provide a concrete `IOutboxStore` from the Postgres adapter package.
3. Register concrete subscribers in a central registry.
4. Expose metrics through the repo-standard observability adapter.
5. Wire `IWakeupSignal` to `LISTEN/NOTIFY` only as a latency hint.
6. Keep `ICrashWindowTestHook` non-noop only in test harnesses.

## Migration note

This package is intended to replace the current in-engine outbox loop by extracting runtime ownership out of the engine process.
During migration, only one production-active owner may exist for a given `(environment, topic, deliveryChannel, sideEffectKind)` tuple.

## Recommended follow-up in repo

- implement `PostgresOutboxStore` in `@dvt/adapter-postgres`,
- add a worker executable app or package host,
- add repo-level OTel / Prometheus adapter,
- connect DLQ replay tooling to the chosen operations package.
