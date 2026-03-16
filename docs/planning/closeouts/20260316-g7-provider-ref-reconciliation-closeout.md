---
slice: g7-provider-ref-reconciliation
date: 2026-03-16
gap: G7
author: AI (GPT-5)
---

# Closeout: G7.3 Provider Execution-ID Reconciliation

## Think-First Analysis

### Problem summary

`G7` remains `Partial` in `main` because the engine pre-bootstrap path persists
an estimated provider run reference before `adapter.startRun()` returns the real
provider execution id. When those ids differ, `run_metadata.providerRunId`
remains stale.

### Root cause

`bootstrapRunTx()` correctly persists metadata plus `RunQueued` atomically, but
the engine never follows up with a metadata reconciliation step after
`adapter.startRun()` returns an execution id that differs from the estimated ref.

### Constraints and invariants

- ADR-0004: event ordering and append-only run lifecycle remain authoritative.
- ADR-0013: pre-bootstrap metadata and first events stay atomic.
- ADR-0015: this change must not move status reads to the provider.
- ADR-0030: post-start persistence failures must not incorrectly convert a live
  workflow into `RunFailed`.
- ADR-0031: `saveProviderRef` must remain tenant-scoped.
- Scope discipline: do not introduce extra contract fields such as
  `requestedRunId` / `providerExecutionRunId` in this slice.

### Options considered

- Add new metadata fields (`requestedRunId`, `providerExecutionRunId`) and keep
  `providerRunId` ambiguous.
  Rejected: larger contract change, not needed to close G7.3.
- Reconcile `providerRunId` after `adapter.startRun()` using a tenant-scoped
  `saveProviderRef?` method on `IRunStateStore`.
  Selected: minimal behavioral change, aligned with the existing storage
  primitives already present in adapters/stores.
- Emit a new event type for provider ref updates in this slice.
  Rejected: correct phase-2 direction, but larger than the current closeout.

### Selected option and rationale

Add and consume `saveProviderRef?(tenantId, runId, update)` as an optional
maintenance primitive, call it fail-soft in `WorkflowEngine` when the actual
provider ref differs from `estimateRunRef()`, add targeted tests, and then sync
the G7 docs/evidence to `Closed`.

### Rejected alternatives

- Contract expansion beyond the existing `providerRunId`.
- Closing G7 in docs without the engine call-site.
- Mixing this slice with unrelated `RunSignalService`, `EngineHealthReporter`,
  API, or adapter-postgres refactors.

## Changes made

| File                                                                                                                        | Change                                                                                     | Why                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [packages/@dvt/engine/src/ports/IRunStateStore.ts](../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)               | Added `ProviderRefUpdate` and optional `saveProviderRef?`                                  | Give the engine a minimal contract to reconcile provider refs after pre-bootstrap start |
| [packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts) | Mirrored the state-store contract change                                                   | Keep engine-facing and shared-kernel interfaces aligned                                 |
| [packages/@dvt/engine/src/state/InMemoryRunStateStore.ts](../../../packages/@dvt/engine/src/state/InMemoryRunStateStore.ts) | Unified `saveProviderRef` signature and enforced tenant scoping                            | Match adapter semantics and cover tenant isolation in tests                             |
| [packages/@dvt/engine/src/state/InMemoryTxStore.ts](../../../packages/@dvt/engine/src/state/InMemoryTxStore.ts)             | Unified `saveProviderRef` signature                                                        | Keep the transactional test store aligned with the port                                 |
| [packages/@dvt/engine/src/core/WorkflowEngine.ts](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)                 | Reconciles the real provider ref after `adapter.startRun()` in the `estimateRunRef()` path | Close the last open G7 code residual without changing lifecycle authority               |
| [packages/@dvt/engine/test/core/WorkflowEngine.test.ts](../../../packages/@dvt/engine/test/core/WorkflowEngine.test.ts)     | Added reconcile, no-op, and fail-soft tests                                                | Prove the new path and guard against regressions                                        |
| [docs/evidence/ED-20260316-g7-provider-ref-reconciliation.md](../../evidence/ED-20260316-g7-provider-ref-reconciliation.md) | Added sub-slice evidence                                                                   | Record the exact G7.3 behavior and validation                                           |
| [docs/evidence/ED-20260316-g7-closeout.md](../../evidence/ED-20260316-g7-closeout.md)                                       | Added final G7 evidence                                                                    | Close G7 with a clean evidence surface                                                  |

## Libraries evaluated

None. This is a bounded engine/storage contract fix, not a library problem.

## Docs synced

- [x] [docs/evidence/index.md](../../evidence/index.md) - add G7 evidence entries
- [x] [docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md](../gaps/G7-AI-EXECUTION-TRACKER.md) - close G7.3/G7.4
- [x] [docs/planning/gaps/GAP_EXECUTION_PLANS.md](../gaps/GAP_EXECUTION_PLANS.md) - move G7 to Closed
- [x] [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md) - reflect G7 Closed
- [x] [docs/planning/status/canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md) - update code/tests/verification map
- [x] [docs/planning/index.md](../index.md) - synced by `docs:sync`

## Test evidence

| Command                                                                                                                     | Result                                               |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation docs:sync`                                                         | PASS                                                 |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter @dvt/contracts build`                                     | PASS                                                 |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter @dvt/engine test`                                         | PASS (`238/238`)                                     |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter @dvt/delivery test`                                       | PASS (`23/23`)                                       |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter dvt-projector-worker typecheck`                           | PASS                                                 |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter dvt-projector-worker test`                                | PASS (`2/2`)                                         |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts` | SKIPPED (`18 skipped`; integration gate not enabled) |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation docs:quality:check`                                                | PASS (warnings preexisting outside slice)            |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation docs:canonical:check`                                              | PASS                                                 |
| `pnpm --dir .worktrees/pr-g7-provider-ref-reconciliation exec markdownlint-cli2 ...`                                        | PASS                                                 |

## Debt introduced

None.
