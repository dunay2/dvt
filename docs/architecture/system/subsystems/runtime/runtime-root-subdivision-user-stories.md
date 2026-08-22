---
title: Runtime Root Subdivision User Stories
status: Active
owner: Architecture / Runtime
last_reviewed: 2026-05-13
planning_type: architecture
---

# Runtime Root Subdivision User Stories

## Stories

| ID         | Story                                                                                                                  | Acceptance criteria                                                                                                                                                                                          | Test evidence                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| RT-SUB-001 | As an architect, I can query a runtime file and see the exact component that owns it.                                  | `@dvt/engine`, `@dvt/state-store`, `@dvt/delivery`, `@dvt/run-domain`, `@dvt/plan-interpreter`, `@dvt/plan-verifier`, `@dvt/crypto`, `@dvt/dsl`, and `@dvt/cli` files map to specific runtime component IDs. | `node --test scripts/check-governance-unit-coverage.test.cjs`                  |
| RT-SUB-002 | As a reviewer, I can verify that `SYS-RUNTIME-ROOT` is only a grouping module.                                         | Runtime root has `level: module` and `owns: []`.                                                                                                                                                             | `real manifest subdivides runtime package files below the runtime root module` |
| RT-SUB-003 | As a plan-store maintainer, I can confirm plan-ref policy ownership was not swallowed by engine core.                  | Plan-ref policy files still map to `SYS-PLANSTORE-ENGINE-FETCH`.                                                                                                                                             | Same semantic architecture test                                                |
| RT-SUB-004 | As a contributor, I can open a runtime package entrypoint and see its owned concern.                                   | Runtime package entrypoints contain `@ownedConcern` docblocks.                                                                                                                                               | review plus package tests                                                      |
| RT-SUB-005 | As a CLI maintainer, I can see that `@dvt/cli` is script-oriented and not a fake user-facing CLI.                      | `cliPackageSurface` names the commands and `userFacingCli: false`.                                                                                                                                           | `pnpm --filter @dvt/cli test`                                                  |
| RT-SUB-006 | As a docs reader, I can understand the runtime grouping without confusing subsystem docs with package component homes. | Runtime subsystem page links canonical component homes and explains the grouping role.                                                                                                                       | `pnpm docs:sync` and `pnpm verify:prepush`                                     |
| RT-SUB-007 | As a future agent, I cannot close runtime coverage by reintroducing a broad root owner.                                | Architecture test fails if root owns files again.                                                                                                                                                            | semantic manifest test                                                         |

## Red/Green Cycles

| Cycle                      | Red command                                                   | Red result                                | Green patch                                                | Green command                                                 |
| -------------------------- | ------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Runtime semantic ownership | `node --test scripts/check-governance-unit-coverage.test.cjs` | `SYS-RUNTIME-ROOT` was still `component`. | Convert root to module and add runtime component owners.   | `node --test scripts/check-governance-unit-coverage.test.cjs` |
| CLI placeholder removal    | `pnpm --filter @dvt/cli test`                                 | `cliPackageSurface` was undefined.        | Replace placeholder with script-oriented package metadata. | `pnpm --filter @dvt/cli test`                                 |

## Out Of Scope

- Splitting `@dvt/engine` internals into source-level governance units.
- Moving `.cjs` CLI behavior into typed command modules.
- Changing runtime behavior, command handlers, adapters, or persistence.
- Creating a new ADR; existing governance rules are sufficient.
