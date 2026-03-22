---
title: S01 — Contract Dead Code Cleanup Closeout
date: 2026-03-21
author: Architecture
planning_type: closeout
parent_plan: phase2-arch-debt-roadmap-20260315
branch: feat/g5-pr1-archive-export-verifier
---

# S01 — Contract Dead Code Cleanup Closeout

## Summary

S01 removes four ghost adapter interfaces, their associated Zod schemas, and
their parse functions from `@dvt/contracts`. These types were never wired into
any runtime path and had accumulated as dead surface area since the early adapter
design was superseded by `IProviderAdapter`.

All S01 acceptance conditions are met. `S02`, `S03`, and `S05` are now unblocked.

---

## Deliverables Completed

### 1. Deleted ghost interface files — `@dvt/contracts`

| File deleted                                                        | Ghost interface          |
| ------------------------------------------------------------------- | ------------------------ |
| `packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts`  | `IOutboxStorageAdapter`  |
| `packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts`      | `IProjectorAdapter`      |
| `packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts`     | `IStateStoreAdapter`     |
| `packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts` | `IWorkflowEngineAdapter` |

### 2. Removed dead schemas — `packages/@dvt/contracts/src/schemas.ts`

- `ExecuteStepRequestSchema` and inferred type `ExecuteStepRequest`
- `ExecuteStepResultSchema` and inferred type `ExecuteStepResult`

These schemas had no callers in the runtime path.

### 3. Removed parse functions — `packages/@dvt/contracts/src/validation.ts`

- `parseExecuteStepRequest`
- `parseExecuteStepResult`

### 4. Updated public index — `packages/@dvt/contracts/src/index.ts`

Removed the four `export *` re-exports for the deleted adapter files.

### 5. Updated test file — `packages/@dvt/contracts/test/validation.test.ts`

Removed the `parseExecuteStepRequest` import and the one test case that exercised it.
Removed the now-unused `toValidationErrorResponse` import that had been paired with it.

### 6. Fixed `validate-contracts.cjs` — `packages/@dvt/cli/validate-contracts.cjs`

Removed the `parseExecuteStepRequest` and `parseExecuteStepResult` imports (lines 14–15)
and two `runCheck` blocks that called them. This was required to un-break the
`Validate Golden JSON Fixtures` CI check on PR #538 which ran `validate-contracts.cjs`
against the now-trimmed `@dvt/contracts/dist/index.js`.

---

## Acceptance Conditions — Verified

| Condition                                | Verified                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stale public surfaces removed            | ✅ Four ghost interfaces and two schemas deleted from public index                                    |
| Dead internal code deleted               | ✅ Parse functions and test case removed                                                              |
| No remaining references to deleted types | ✅ `validate-contracts.cjs` updated; CI green                                                         |
| Downstream slices unblocked              | ✅ S02 (`IRunStateStore` split), S03 (coordinator extraction), S05 (payload versioning) can now start |

---

## Out of Scope

- Typed engine errors replacing message-based branching (original S01 acceptance goal — deferred to S02/S03 decomposition)
