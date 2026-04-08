---
slice: run-domain-projection
date: 2026-03-15
last_reviewed: 2026-03-15
gap: domain-cohesion-refactor
author: AI (GPT-5)
---

# Closeout: Extract canonical run projection into @dvt/run-domain

## Think-First Analysis

### Problem summary

`SnapshotProjector` in `@dvt/engine` and `PostgresRunSnapshotStore` in
`@dvt/adapter-postgres` both implement run-event projection rules. The two
implementations are already close enough to drift risk, and only the engine path
currently enforces terminal-state guards.

### Root cause

Projection rules still live inside infrastructure and engine packages instead of
behind one canonical domain boundary. That duplicates event-to-snapshot logic and
makes adapter replay behavior diverge from engine replay behavior.

### Constraints and invariants

- `ADR-0003`: execution semantics remain DVT-owned, not provider-owned.
- `ADR-0004`: replay and projection must be deterministic and reconstruct the same
  state from the append-only log.
- `ADR-0015`: status reads come from projected snapshot materialization, not live
  provider queries.
- `ADR-0031`: adapter reads and writes stay tenant-scoped at the adapter boundary.
- `AGENTS.md`: no stubs, no hidden debt, think-first before code, closeout required.

### Options considered

- Keep projection logic duplicated in `engine` and `adapter-postgres`.
  Rejected: preserves drift and inconsistent guards.
- Extract a small package `@dvt/run-domain` containing the pure projection
  function and domain error.
  Selected: smallest slice that centralizes rules without forcing the larger
  `WorkflowEngine` refactor.
- Introduce a third-party event-sourcing library.
  Rejected: no maintained library fits this repository's event contract,
  deterministic snapshot shape, and terminal-state rules better than a small
  explicit function.

### Selected option and rationale

Create `@dvt/run-domain` with a pure `applyRunEvent` function and
`InvalidStateTransitionError`, then make both `engine` and
`adapter-postgres` reuse that implementation. Keep the slice narrow: no
`WorkflowEngine` coordinator extraction, no aggregate-root redesign here.

### Rejected alternatives

- Shipping only the new package without wiring `adapter-postgres`.
- Bundling `RunAggregate`, `StartRunCoordinator`, or other engine refactors into
  the same PR.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - add `@dvt/run-domain`
  - wire `SnapshotProjector`
  - wire `PostgresRunSnapshotStore`
  - update focused tests and package wiring
- Touched files or paths:
  - `packages/@dvt/run-domain/**`
  - `packages/@dvt/engine/src/core/SnapshotProjector.ts`
  - `packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts`
  - `packages/@dvt/engine/package.json`
  - `packages/@dvt/engine/tsconfig.json`
  - `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  - `packages/@dvt/adapter-postgres/package.json`
  - `packages/@dvt/adapter-postgres/tsconfig.json`
- Expected outcome:
  - one canonical projection implementation
  - same terminal-state guard behavior for engine replay and Postgres rebuild
- Risks and mitigations:
  - risk: adapter rebuild behavior changes on invalid historical streams
  - mitigation: add tests for negative terminal-state paths and keep unknown-event
    fail-open behavior
- Out-of-scope items:
  - `WorkflowEngine` decomposition
  - `RunAggregate` cleanup
  - API endpoints or new contracts
- Validation plan:
  - `pnpm --filter @dvt/run-domain test`
  - `pnpm --filter @dvt/engine test -- --runInBand` if needed, otherwise package test
  - `pnpm --filter @dvt/adapter-postgres test`
  - docs checks for closeout markdown
- Test coverage plan:
  - negative path: terminal run mutation rejected
  - negative path: terminal step mutation rejected
  - compatibility path: unknown event tolerated
  - adapter path: snapshot rebuild uses shared projector semantics
- Libraries evaluated:
  - None adopted; the rule set is repo-specific and smaller than a safe library
    integration.

## Changes made

| File                                                                                                                   | Change                                                                       | Why                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/@dvt/run-domain/**`                                                                                          | New package with canonical `applyRunEvent` and `InvalidStateTransitionError` | Centralize projection semantics in one domain boundary   |
| `packages/@dvt/engine/src/core/SnapshotProjector.ts`                                                                   | Delegates `applyRunEvent` to `@dvt/run-domain`                               | Remove duplicated engine-only projection logic           |
| `packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts`                                                 | Asserts shared error type/details                                            | Preserve negative-path behavior through the new boundary |
| `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`                                                       | Reuses `@dvt/run-domain` during rebuild and incremental updates              | Align adapter replay with engine replay semantics        |
| `packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`                                                 | Adds invalid historical replay test                                          | Prove adapter uses shared terminal-state guards          |
| `packages/@dvt/engine/package.json`, `packages/@dvt/adapter-postgres/package.json`, `tsconfig*.json`, `pnpm-lock.yaml` | Workspace/package wiring for the new package                                 | Keep build, lint, and import resolution aligned          |

## Libraries evaluated

None adopted. No third-party library fit the repository-specific event projection
rules better than a small explicit pure function.

## Docs synced

- [x] `docs/planning/closeouts/20260315-run-domain-projection-closeout.md` - slice closeout created and updated
- [x] `docs/planning/index.md` - checked via `docs:sync` and already current, no diff required

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                  | Result                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm install`                                                                                                                                                                                                                                                                                                                                           | Passed                                                           |
| `pnpm --filter @dvt/contracts build`                                                                                                                                                                                                                                                                                                                     | Passed                                                           |
| `pnpm --filter @dvt/run-domain build`                                                                                                                                                                                                                                                                                                                    | Passed                                                           |
| `pnpm exec tsc --noEmit -p tsconfig.json`                                                                                                                                                                                                                                                                                                                | Passed                                                           |
| `pnpm exec eslint packages/@dvt/run-domain/src/*.ts packages/@dvt/run-domain/test/*.test.ts packages/@dvt/engine/src/core/SnapshotProjector.ts packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts` | Passed                                                           |
| `pnpm exec vitest run packages/@dvt/run-domain/test/applyRunEvent.test.ts packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts`                                                                                                                                                                                                          | Passed outside sandbox after `spawn EPERM` under sandbox         |
| `pnpm exec vitest run packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts`                                                                                                                                                                                                                                                              | Passed outside sandbox after `spawn EPERM` under sandbox         |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                         | Passed                                                           |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260315-run-domain-projection-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                                                                                                                                   | Passed                                                           |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                | Passed with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                              | Passed                                                           |

## Debt introduced

None.
