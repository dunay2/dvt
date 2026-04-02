---
title: 'ED-20260315 - G10 Closeout: outbox_lineage worker + fail-open DLQ'
status: accepted
owners: delivery
date: 2026-03-15
gap: G10
arc: ARC-1
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts
  - packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql
  - packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
  - packages/@dvt/delivery/src/application/LineageOutboxObserver.ts
  - packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts
  - packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts
  - apps/lineage-worker/src/server.ts
evidence:
  tests: []
  notes:
    - Durable lineage outbox and dead-letter tables ship as migration 005.
    - Delivery runtime enqueues StepStarted lineage records fail-soft and processes them via a dedicated worker.
    - OpenLineage publication is provided through HttpOpenLineageSink.
    - Delivery, adapter-postgres, traceability-service, and lineage-worker validation lanes passed.
---

# ED-20260315 - G10 Closeout: outbox_lineage worker + fail-open DLQ

## 1. Summary

G10 is **Closed**. This slice delivers the runtime and persistence path that had
been deferred after `G6`:

1. `ILineageSink` and `ILineageOutboxStore` contract interfaces in
   `@dvt/contracts`
2. `lineage_outbox` and `lineage_dead_letter` tables as migration `005`
3. `PostgresLineageOutboxStore` as the durable lineage queue backend
4. `LineageOutboxObserver` as the fail-soft bridge from domain outbox delivery
   to the lineage queue
5. `LineageWorkerRuntime` as the polling worker with retry and DLQ behavior
6. `HttpOpenLineageSink` as the HTTP publisher to a Marquez-compatible
   OpenLineage API
7. `apps/lineage-worker` as the standalone composition root

## 2. Design decision

**Option B (separate `lineage_outbox` table + dedicated worker)** was selected
over:

- Option A (in-process observer hook with no persistence) - rejected because it
  has no DLQ and loses events on crash
- Option C (watermark over `run_events`) - rejected because per-run `run_seq`
  does not provide a safe global cursor

Fail-open is enforced at three boundaries:

1. `LineageOutboxObserver.onRecordDelivered` logs and swallows enqueue failures
2. `LineageWorkerRuntime.processRecord` retries or dead-letters per record and
   never aborts the whole batch
3. Dead-letter write failures are logged and not re-thrown into domain delivery

## 3. Canonical spec

- [G10 AI Execution Tracker](../archive/planning/gaps/G10-AI-EXECUTION-TRACKER.md)
- [Gap Execution Plans - G10](../planning/gaps/GAP_EXECUTION_PLANS.md)
- [G6 OpenLineage CI Schema Pin Plan](../planning/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)

## 4. Code paths

| Path                                                                    | Change                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts`      | New lineage contracts: sink, outbox store, records, publish payload, attempt cap |
| `packages/@dvt/contracts/src/index.ts`                                  | Export lineage contracts from the shared-kernel barrel                           |
| `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql`      | New `lineage_outbox` and `lineage_dead_letter` DDL                               |
| `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts`      | New Postgres implementation of `ILineageOutboxStore`                             |
| `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`       | Expose `lineageOutboxStore` and wire the new backend                             |
| `packages/@dvt/adapter-postgres/src/index.ts`                           | Export `PostgresLineageOutboxStore`                                              |
| `packages/@dvt/delivery/src/application/LineageOutboxObserver.ts`       | New fail-soft observer that enqueues delivered `StepStarted` events              |
| `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts`        | New runtime with polling, retry, dead-letter, and lag reporting                  |
| `packages/@dvt/delivery/src/index.ts`                                   | Export lineage runtime and observer                                              |
| `packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts` | New HTTP `ILineageSink` implementation                                           |
| `packages/@dvt/traceability-service/src/lineage/index.ts`               | Export `HttpOpenLineageSink`                                                     |
| `apps/lineage-worker/**`                                                | New worker app, env validation, and bootstrap server                             |

## 5. Validation paths

| Command                                                                         | Result                      |
| ------------------------------------------------------------------------------- | --------------------------- |
| `pnpm --filter @dvt/contracts build`                                            | PASS                        |
| `pnpm --filter @dvt/adapter-postgres build`                                     | PASS                        |
| `pnpm --filter @dvt/adapter-postgres test`                                      | PASS, 13/13 with 23 skipped |
| `pnpm --filter @dvt/traceability-service build`                                 | PASS                        |
| `pnpm --filter @dvt/delivery build`                                             | PASS                        |
| `pnpm --filter @dvt/delivery test`                                              | PASS, 14/14                 |
| `pnpm exec vitest run packages/@dvt/delivery/test/LineageWorkerRuntime.test.ts` | PASS, 14/14                 |
| `pnpm --filter dvt-lineage-worker typecheck`                                    | PASS                        |
| `pnpm --filter dvt-lineage-worker build`                                        | PASS                        |

## 6. Acceptance criteria

| #   | Criterion                                                                                          | Status |
| --- | -------------------------------------------------------------------------------------------------- | ------ |
| 1   | `ILineageSink` and `ILineageOutboxStore` interfaces exist in `@dvt/contracts`                      | YES    |
| 2   | `lineage_outbox` and `lineage_dead_letter` tables exist as migration `005`                         | YES    |
| 3   | `PostgresLineageOutboxStore` implements `ILineageOutboxStore`                                      | YES    |
| 4   | `LineageOutboxObserver` implements `OutboxWorkerObserver` and populates `lineage_outbox` fail-soft | YES    |
| 5   | `LineageWorkerRuntime` polls `lineage_outbox`, maps, publishes, retries, and dead-letters          | YES    |
| 6   | `HttpOpenLineageSink` implements `ILineageSink` and performs HTTP publication                      | YES    |
| 7   | `apps/lineage-worker` provides the standalone process with env validation and `/healthz`           | YES    |
| 8   | `lagCount` getter exists on `LineageWorkerRuntime`                                                 | YES    |
| 9   | Fail-open semantics keep domain delivery unblocked                                                 | YES    |
| 10  | The G10 validation lane listed above is green                                                      | YES    |
