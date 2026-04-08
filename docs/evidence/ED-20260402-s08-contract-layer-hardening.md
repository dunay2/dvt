---
title: S08 contract-layer hardening for persisted plan records
status: Accepted
date: 2026-04-02
owners:
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/contracts/test/validation.test.ts
  - packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm verify:prepush
---

# ED-20260402 S08 contract-layer hardening

## Decision captured

This evidence closes the `S08-2` contract-layer slice by hardening the new
persisted plan-record family so it stays aligned with the canonical
`ExecutionPlan`, explicit state modeling, and the accepted ownership boundary in
`ADR-0043`.

## What this evidence proves

1. `PlanRecord` now reuses the canonical planner identity vocabulary and
   rejects any mismatch between top-level record metadata and the embedded
   canonical `ExecutionPlan` JSON.
2. `PlanRecord` and `PlanExecutabilityRecord` now use explicit state variants
   instead of loose optionals that allowed impossible combinations.
3. `PlanExecutabilityRecord.rejectionReport.code` is locked to the canonical
   planner rejection vocabulary rather than an open string.
4. The planner-record schemas and parse helpers are now typed to the exported
   public contracts instead of separate schema-inferred surfaces.
5. The slice is documented and governed as planner-contract work while leaving
   `@dvt/artifacts` port ownership and runtime migration for later S08 slices.

## Validation results

- `pnpm --filter @dvt/contracts build`
  - Passed.
- `pnpm --filter @dvt/contracts test`
  - Passed.
  - Result: `9` test files passed and `98` tests passed.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - Executed with PowerShell environment syntax.
  - Returned `ARC-0` because the tool compares `origin/main...HEAD` and does
    not see uncommitted worktree changes.
  - ARC-2 evidence and a risk update were still added because
    `.arc-policy.yaml` explicitly treats `packages/@dvt/contracts/**` as
    ARC-governed.
- `pnpm docs:sync`
  - Passed.
  - Regenerated `docs/adr/index.md`, `docs/contracts/planner/index.md`,
    `docs/evidence/index.md`, and `docs/planning/state/agent-lane-a.md`.
- `pnpm docs:workboard:generate`
  - Passed.
  - Updated `docs/planning/state/execution-workboard.md` and
    `docs/planning/state/open-task-route.md`.
- `pnpm docs:status:generate`
  - Passed.
  - Updated `docs/planning/status/generated-code-state.md`.
- `pnpm verify:prepush`
  - Passed.
  - Included the repo pre-push type-check chain plus the changed-only docs and
    ARC validation checks.
  - The changed-only docs checks reported no changed committed diff input,
    which matches the current uncommitted worktree state of this slice.
