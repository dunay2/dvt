---
title: Lineage DLQ alerting and automatic replay
status: Accepted
date: 2026-03-30
owners:
  - '@dvt/delivery'
  - '@dvt/adapter-postgres'
  - 'dvt-lineage-worker'
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts
  - packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts
  - packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts
  - apps/lineage-worker/src/env.ts
  - apps/lineage-worker/src/server.ts
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/delivery/test/LineageWorkerRuntime.test.ts
    - pnpm -C packages/@dvt/adapter-postgres test -- PostgresLineageOutboxStore.test.ts
    - pnpm -C apps/lineage-worker exec vitest run test/bootstrap.test.ts test/server.bootstrap.test.ts
---

# Lineage DLQ alerting and automatic replay

## Scope

Adds DLQ observability and auto-replay control for lineage outbox processing.

## Behavioral evidence

1. `ILineageOutboxStore` now exposes optional dead-letter count/replay operations.
2. `PostgresLineageOutboxStore` implements tenant-scoped `countDeadLetter` and `replayDeadLetters`.
3. `LineageWorkerRuntime` can:
   - emit backlog alert logs when dead-letter lag reaches a threshold,
   - replay dead letters automatically in bounded batches.
4. `lineage-worker` runtime wiring adds env-driven configuration and exposes `deadLetterLag` on admin health output.

## Validation notes

- Full `apps/lineage-worker` suite currently includes a pre-existing failure outside this slice:
  CommonJS named-export mismatch for `lru-cache` under traceability resolver tests.
- Touched worker bootstrap tests pass and validate the new wiring path.
