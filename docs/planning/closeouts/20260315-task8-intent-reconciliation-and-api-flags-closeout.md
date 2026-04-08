---
slice: intent-reconciliation-and-api-flags
date: 2026-03-15
last_reviewed: 2026-03-15
gap: domain-cohesion-refactor
author: AI (Codex)
---

# Closeout: Harden Intent Reconciliation And API Boolean Flags

## Changes made

| File                                                                                                                                                                                    | Change                                                                                                                 | Why                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [packages/@dvt/engine/src/services/RunMaintenanceService.ts](../../../packages/@dvt/engine/src/services/RunMaintenanceService.ts)                                                       | Stopped resolving `PENDING` intents from metadata-only evidence; keep them retryable unless provider state is verified | Prevent false closure when pre-bootstrap metadata exists before provider start is confirmed |
| [packages/@dvt/engine/test/services/RunMaintenanceService.intentReconciliation.test.ts](../../../packages/@dvt/engine/test/services/RunMaintenanceService.intentReconciliation.test.ts) | Added negative-path coverage for metadata-without-workflow and missing `lookupRunRef`                                  | Prove the new reconciliation semantics                                                      |
| [packages/@dvt/engine/test/services/RunMaintenanceService.test.ts](../../../packages/@dvt/engine/test/services/RunMaintenanceService.test.ts)                                           | Updated legacy expectation for adapters without `lookupRunRef`                                                         | Align test contract with the safer retryable behavior                                       |
| [apps/api/src/plugins/env.ts](../../../apps/api/src/plugins/env.ts)                                                                                                                     | Replaced `z.coerce.boolean()` with strict boolean preprocessing                                                        | Avoid fail-open parsing of `"false"` / `"0"` on operational flags                           |
| [apps/api/test/plugins/env.test.ts](../../../apps/api/test/plugins/env.test.ts)                                                                                                         | Added tests for strict boolean parsing and ambiguous-string rejection                                                  | Cover non-happy-path env configuration                                                      |
| [packages/@dvt/adapter-postgres/migrations/004_run_snapshots_and_status_index.sql](../../../packages/@dvt/adapter-postgres/migrations/004_run_snapshots_and_status_index.sql)           | Made migration `004` create `run_snapshots` when absent before altering/indexing it                                    | Fix the fresh-schema golden-path failure seen in CI                                         |
| [docs/planning/closeouts/20260315-task8-intent-reconciliation-and-api-flags-thinkfirst.md](./20260315-task8-intent-reconciliation-and-api-flags-thinkfirst.md)                          | Added the think-first analysis for this blocker slice                                                                  | Keep the bug fix traceable to ADR-backed reasoning                                          |

## Libraries evaluated

None adopted. Reused the repo-local `envBoolean` preprocessing pattern already present in [apps/outbox-worker/src/plugins/env.ts](../../../apps/outbox-worker/src/plugins/env.ts).

## Docs synced

- [x] [docs/planning/closeouts/20260315-task8-intent-reconciliation-and-api-flags-thinkfirst.md](./20260315-task8-intent-reconciliation-and-api-flags-thinkfirst.md) — think-first and implementation brief added to this branch
- [x] [docs/planning/closeouts/20260315-task8-intent-reconciliation-and-api-flags-closeout.md](./20260315-task8-intent-reconciliation-and-api-flags-closeout.md) — validation and no-debt evidence recorded

## Test evidence

| Command                                    | Result                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm --filter @dvt/engine test`           | Passed (`229/229`)                                                       |
| `pnpm --filter dvt-api test`               | Passed (`38/38`)                                                         |
| `pnpm --filter @dvt/adapter-postgres test` | Passed (`11` pass, `23` skipped by integration gate)                     |
| `pnpm golden:validate`                     | Passed                                                                   |
| `pnpm docs:sync`                           | Passed                                                                   |
| `pnpm docs:quality:check`                  | Passed with pre-existing warnings on non-English docs outside this slice |
| `pnpm docs:canonical:check`                | Passed                                                                   |

## Debt introduced

None.
