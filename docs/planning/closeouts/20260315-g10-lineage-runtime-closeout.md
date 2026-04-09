---
slice: g10-lineage-runtime
date: 2026-03-15
last_reviewed: 2026-03-15
gap: G10
author: AI (GPT-5)
---

# Closeout: G10 Lineage Runtime

## Think-First Analysis

### Problem summary

The repository had lineage mapping and traceability contracts, but not the
runtime path that durably delivers lineage events with fail-open semantics.

### Root cause

`G6` closed mapper and schema validation work, while delivery and runtime were
deferred to `G10`.

### Constraints and invariants

- `ADR-0009`: outbox publication ordering remains an invariant.
- `ADR-0031`: storage adapters remain tenant-scoped at the boundary.
- `ADR-0034`: delivery runtime logic belongs in `@dvt/delivery`; apps are
  composition roots.
- `AGENTS.md`: no stubs, no hidden debt, docs and status surfaces must match
  the shipped runtime.

### Options considered

- Separate `lineage_outbox` table plus dedicated lineage worker runtime and app
- In-process observer with no persistent queue
- Global watermark over `run_events`
- Libraries evaluated: none; the queue/runtime shape is repository-specific

### Selected option and rationale

Ship a dedicated lineage outbox plus worker runtime. That gives durable retry
and DLQ behavior and keeps lineage fail-open relative to domain delivery.

### Rejected alternatives

- Observer-only publishing: rejected because there is no durability or DLQ
- Watermark over `run_events`: rejected because per-run ordering is not a safe
  global delivery cursor

## Changes made

| File                                                                                                                                                | Change                                                                              | Why                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts`                                                                                  | Added lineage sink and outbox contracts plus attempt cap constant                   | Formalize the `G10` runtime boundary in the shared kernel        |
| `packages/@dvt/contracts/src/index.ts`                                                                                                              | Exported the lineage contracts                                                      | Make the new boundary consumable by delivery and adapters        |
| `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql`                                                                                  | Added lineage outbox and dead-letter tables                                         | Persist lineage retry and DLQ state durably                      |
| `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts`                                                                                  | Added Postgres implementation of `ILineageOutboxStore`                              | Give delivery a durable lineage queue backend                    |
| `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`                                                                                   | Wired `lineageOutboxStore` and removed unrelated constructor drift                  | Expose the new queue cleanly without carrying root contamination |
| `packages/@dvt/adapter-postgres/src/index.ts`                                                                                                       | Exported `PostgresLineageOutboxStore` and dropped unrelated export drift            | Keep the adapter barrel aligned with the actual slice            |
| `packages/@dvt/delivery/src/application/LineageOutboxObserver.ts`                                                                                   | Added fail-soft observer                                                            | Keep lineage fail-open relative to domain delivery               |
| `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts`                                                                                    | Added polling runtime with retry, DLQ, and lag reporting                            | Implement the dedicated lineage delivery host                    |
| `packages/@dvt/delivery/src/index.ts`                                                                                                               | Exported lineage runtime and observer and removed accidental projector export drift | Keep the delivery barrel coherent with `origin/main` plus `G10`  |
| `packages/@dvt/delivery/test/LineageWorkerRuntime.test.ts`                                                                                          | Added runtime and observer coverage                                                 | Validate retry, dead-letter, fail-soft, and stop/start behavior  |
| `packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts`                                                                             | Added HTTP sink implementation and export                                           | Provide a concrete OpenLineage publisher behind `ILineageSink`   |
| `apps/lineage-worker/**`                                                                                                                            | Added standalone worker app, env parsing, and bootstrap server                      | Provide the composition root for operating the lineage runtime   |
| `docs/evidence/critical/ED-20260315-g10-closeout.md` and `docs/planning/gaps/G10-AI-EXECUTION-TRACKER.md`                                           | Added evidence and tracker for `G10`                                                | Record runtime completion with explicit validation               |
| `docs/planning/gaps/GAP_EXECUTION_PLANS.md`, `docs/architecture/system-delivery-status.md`, and `docs/planning/status/canonical-doc-code-matrix.md` | Synced active status docs                                                           | Keep canonical status surfaces aligned with the shipped slice    |

## Libraries evaluated

None evaluated - the runtime and queue boundary are repository-specific.

## Docs synced

- [x] `docs/planning/closeouts/20260315-g10-lineage-runtime-closeout.md` -- think-first and final evidence for this slice
- [x] `docs/evidence/critical/ED-20260315-g10-closeout.md` -- implementation evidence aligned with shipped runtime
- [x] `docs/planning/gaps/G10-AI-EXECUTION-TRACKER.md` -- tracker reflects the shipped slice
- [x] `docs/planning/gaps/GAP_EXECUTION_PLANS.md` -- `G10` status aligned
- [x] `docs/architecture/system-delivery-status.md` -- current-state summary aligned
- [x] `docs/planning/status/canonical-doc-code-matrix.md` -- canonical topic mapping aligned

## Test evidence

| Command                                                                         | Result                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm install --no-frozen-lockfile`                                             | PASS                                                                          |
| `pnpm --filter @dvt/contracts build`                                            | PASS                                                                          |
| `pnpm --filter @dvt/adapter-postgres build`                                     | PASS                                                                          |
| `pnpm --filter @dvt/adapter-postgres test`                                      | PASS, 13/13 with 23 skipped                                                   |
| `pnpm --filter @dvt/traceability-service build`                                 | PASS                                                                          |
| `pnpm --filter @dvt/delivery build`                                             | PASS                                                                          |
| `pnpm --filter @dvt/delivery test`                                              | PASS, 14/14                                                                   |
| `pnpm exec vitest run packages/@dvt/delivery/test/LineageWorkerRuntime.test.ts` | PASS, 14/14                                                                   |
| `pnpm --filter dvt-lineage-worker typecheck`                                    | PASS                                                                          |
| `pnpm --filter dvt-lineage-worker build`                                        | PASS                                                                          |
| `pnpm docs:sync`                                                                | PASS                                                                          |
| `pnpm docs:quality:check`                                                       | PASS with pre-existing warnings outside this slice                            |
| `pnpm docs:canonical:check`                                                     | PASS                                                                          |
| `pnpm verify:prepush`                                                           | PASS                                                                          |
| `pnpm exec prettier --check ...` on touched files                               | PASS                                                                          |
| `pnpm exec eslint ...` on touched files                                         | FAILED locally: worktree install still misses `debug` for `eslint`            |
| `pnpm exec markdownlint-cli2 ...` on touched docs                               | FAILED locally: worktree install still misses `fastq` for `markdownlint-cli2` |

## Debt introduced

None.
