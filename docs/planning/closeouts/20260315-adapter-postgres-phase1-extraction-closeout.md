---
slice: 20260315-adapter-postgres-phase1-extraction
date: 2026-03-15
gap: G2
author: AI (GPT-5)
---

# Closeout: Adapter Postgres Phase 1 Extraction

## Think-First Analysis

### Problem summary

`PostgresStateStoreAdapter` in `@dvt/adapter-postgres` had accumulated schema,
metadata, event-log, snapshot, outbox, and transaction-coordination
responsibilities in one class. The implementation already existed in the dirty
workspace, but not in an isolated, publishable slice.

### Root cause

The adapter became the default landing zone for every new persistence concern.
That mixed table-specific SQL with orchestration logic and made tenant-isolation
review, maintenance, and focused testing harder than necessary.

### Constraints and invariants

- `ADR-0004` requires append-only event persistence and deterministic replay.
- `ADR-0013` requires metadata, events, snapshots, and outbox effects to stay
  transactionally aligned on bootstrap and append paths.
- `ADR-0015` requires snapshot behavior to remain projection-based.
- `ADR-0031` requires tenant-scoped adapter reads and writes.
- `AGENTS.md` and `ai-work-protocol.md` require a real validation trail and a
  mandatory closeout file.

### Options considered

- Keep the monolithic adapter and only document the refactor.
  Rejected because it leaves the code-quality problem intact.
- Extract the table-focused stores and keep `PostgresStateStoreAdapter` as the
  transaction coordinator.
  Selected because it preserves behavior while narrowing responsibilities.
- Introduce an ORM or data-mapper abstraction.
  Rejected because no maintained library already fits this repo's
  event-sourcing and tenant-context patterns, and it would expand scope.

### Selected option and rationale

Publish the existing extraction as a clean slice: dedicated Postgres stores for
schema, outbox, metadata, events, and snapshots, with
`PostgresStateStoreAdapter` kept as the facade and transaction coordinator.

### Rejected alternatives

- Publish a docs-only PR first.
- Fold this work into a larger engine/API refactor PR.
- Rebuild the extraction from scratch instead of isolating the existing code.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - extract storage responsibilities inside `@dvt/adapter-postgres`
  - publish the related evidence and this closeout
  - keep runtime behavior and package role unchanged
- Touched files or paths:
  - `packages/@dvt/adapter-postgres/**`
  - `docs/evidence/ED-20260315-adapter-postgres-phase1-items5-7.md`
  - `docs/planning/closeouts/20260315-adapter-postgres-phase1-extraction-closeout.md`
- Expected outcome:
  - `PostgresStateStoreAdapter` becomes a thinner facade
  - extracted stores compile and package tests pass without widening scope
- Risks and mitigations:
  - risk: partial copy from the dirty workspace leaves compile gaps
    mitigation: validate in a clean worktree before commit
  - risk: docs over-claim behavior outside this slice
    mitigation: keep docs limited to evidence and closeout
- Out-of-scope items:
  - engine refactors outside `@dvt/adapter-postgres`
  - API/admin route work
  - projector worker/runtime work
- Validation plan:
  - `pnpm --filter @dvt/adapter-postgres typecheck`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm docs:sync`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
- Test coverage plan:
  - preserve existing adapter tests
  - confirm the migrate-state negative path still passes
  - do not claim new behavior without package-level validation
- Libraries evaluated:
  - None adopted; no maintained library fit this storage slice better than the
    existing repo pattern.

## Changes made

| File                                                                              | Change                                                             | Why                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`                     | Extract schema and DDL lifecycle from the main adapter             | Separate migration readiness and compatibility patches from data access       |
| `packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts`                       | Extract outbox and dead-letter persistence                         | Narrow outbox responsibility and keep retry/dead-letter SQL local             |
| `packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts`             | Extract `run_metadata` operations                                  | Isolate tenant-scoped metadata reads and writes                               |
| `packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts`                     | Extract `run_events` append and list logic                         | Keep ordering and idempotency logic focused and testable                      |
| `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`                  | Extract `run_snapshots` reads and replay/update logic              | Separate read-model projection persistence from transaction orchestration     |
| `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`                 | Reduce to facade plus transactional coordinator                    | Keep connection lifecycle and multi-store transaction boundaries in one place |
| `packages/@dvt/adapter-postgres/src/index.ts`                                     | Export the extracted store classes                                 | Publish the refactored package surface explicitly                             |
| `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`   | Update migrate-state assertion to follow `schemaManager` ownership | Keep tests aligned with the extracted migration state owner                   |
| `docs/evidence/ED-20260315-adapter-postgres-phase1-items5-7.md`                   | Record extraction evidence and validation                          | Tie the slice to explicit proof                                               |
| `docs/planning/closeouts/20260315-adapter-postgres-phase1-extraction-closeout.md` | Record think-first, scope, and validation evidence                 | Satisfy mandatory closeout governance                                         |

## Libraries evaluated

None adopted; see Think-First analysis.

## Docs synced

- [x] `docs/evidence/ED-20260315-adapter-postgres-phase1-items5-7.md` - extracted-store evidence aligned with the shipped slice
- [x] `docs/planning/closeouts/20260315-adapter-postgres-phase1-extraction-closeout.md` - think-first, implementation record, and validation evidence
- [x] `docs/evidence/index.md` - regenerated by `pnpm docs:sync` so the new evidence doc is indexed

## Test evidence

| Command                                         | Result                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm --filter @dvt/adapter-postgres typecheck` | PASS                                                                |
| `pnpm --filter @dvt/adapter-postgres test`      | PASS - 11 passed, 23 skipped (`DVT_PG_INTEGRATION` and smoke-gated) |
| `pnpm docs:sync`                                | PASS                                                                |
| `pnpm docs:quality:check`                       | PASS with pre-existing non-English warnings outside this slice      |
| `pnpm docs:canonical:check`                     | PASS                                                                |

## Debt introduced

None.
