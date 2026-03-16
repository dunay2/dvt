---
slice: g7-projector-worker-runtime
date: 2026-03-16
gap: G7
author: AI (GPT-5)
---

# Closeout: G7.2 Projector Worker Runtime

## Changes made

| File                                                                                                                                             | Change                                                                        | Why                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [packages/@dvt/engine/src/ports/IRunStateStore.ts](../../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)                                 | Added optional `listStaleSnapshotRuns(batchSize)` to the engine-internal port | Gives the catch-up worker a store-owned way to find missing/stale snapshots     |
| [packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts](../../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)                   | Added optional `listStaleSnapshotRuns(batchSize)` to the shared contract      | Keeps the public contract aligned with the engine port                          |
| [packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts) | Added the standalone catch-up runtime loop                                    | Moves projector runtime ownership into `@dvt/delivery` instead of `@dvt/engine` |
| [packages/@dvt/delivery/src/index.ts](../../../../packages/@dvt/delivery/src/index.ts)                                                           | Exported `ProjectorWorkerRuntime`                                             | Makes the runtime available to app composition roots                            |
| [packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts](../../../../packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts)             | Added runtime unit tests, including failure and stop paths                    | Covers backlog processing, lag reporting, and non-happy-path behavior           |
| [packages/@dvt/delivery/package.json](../../../../packages/@dvt/delivery/package.json)                                                           | Included the new runtime tests in the package test command                    | Keeps the delivery package validation lane authoritative                        |
| [apps/projector-worker/package.json](../../../../apps/projector-worker/package.json)                                                             | Added standalone worker workspace                                             | Provides a composition root for the projector runtime                           |
| [apps/projector-worker/src/env.ts](../../../../apps/projector-worker/src/env.ts)                                                                 | Added worker env parsing                                                      | Formalizes worker config and defaults                                           |
| [apps/projector-worker/src/server.ts](../../../../apps/projector-worker/src/server.ts)                                                           | Added worker bootstrap, `/healthz`, and graceful shutdown                     | Creates the operational host for the catch-up projector                         |
| [apps/projector-worker/test/env.test.ts](../../../../apps/projector-worker/test/env.test.ts)                                                     | Added negative/default env tests                                              | Covers missing `DATABASE_URL` and default worker settings                       |

## Libraries evaluated

None. The slice reused the existing in-repo runtime pattern established by
`OutboxWorkerRuntime`; no external worker-loop library fit the repo's existing
delivery ownership and adapter-boundary constraints better than the local
pattern already in production.

## Docs synced

- [x] [docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md](../gaps/G7-AI-EXECUTION-TRACKER.md) — marked G7.2 done, advanced the current pointer to G7.3, and recorded validation
- [x] [docs/planning/gaps/GAP_EXECUTION_PLANS.md](../gaps/GAP_EXECUTION_PLANS.md) — corrected G7 from `Closed` to `Partial` and listed G7.3/G7.4 as remaining
- [x] [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md) — aligned engine/read-model status back to `Partial`
- [x] [docs/planning/status/canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md) — added the projector catch-up topic mapping

## Test evidence

| Command                                        | Result         |
| ---------------------------------------------- | -------------- |
| `pnpm --filter @dvt/contracts build`           | PASS           |
| `pnpm --filter @dvt/engine build`              | PASS           |
| `pnpm --filter @dvt/delivery test`             | PASS (`23/23`) |
| `pnpm --filter dvt-projector-worker typecheck` | PASS           |
| `pnpm --filter dvt-projector-worker build`     | PASS           |
| `pnpm --filter dvt-projector-worker test`      | PASS (`2/2`)   |

## Debt introduced

None. `G7` remains explicitly `Partial` because `G7.3` provider run-id
reconciliation is still open; this slice does not hide that residual.
