---
title: RC-G1 governance startup and health reconciliation
status: Accepted
date: 2026-04-02
owners:
  - docs
  - packages/@dvt/engine
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - docs/planning/state/agent-lane-a.yaml
  - docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md
  - docs/planning/reviews/event-contract-and-traceability/20260326-reconciler-runtime-solid-qa-review.md
  - docs/planning/proposals/governance-startup-card-router-plan-20260402.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# ED-20260402 RC-G1 governance startup and health reconciliation

## Decision captured

This evidence closes the reconciliation slice that:

1. repaired the `MockAdapter` baseline blocker;
2. registered `RC-G1` and `GOV-S1` in canonical planning state;
3. kept health/readiness implementation closed in `apps/api`;
4. implemented the startup card/router directly in the governance inventory and
   AI work protocol.

## What this evidence proves

1. `dvt-api` validation is no longer blocked by the `MockAdapter` typo.
2. The reconciler runtime review now points to a real Lane A tracker instead of
   a missing workboard task.
3. The ownership proposal and the workboard now describe the same `RC-G1`
   execution slices.
4. The governance startup improvement exists in canonical repo documents, not in
   an ad hoc local execution note.

## Validation results

- `pnpm --filter @dvt/engine build`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test`
  - Passed.
  - Result: `49` test files passed, `1` skipped; `280` tests passed, `6`
    skipped.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - Executed successfully, but returned `ARC-0` because it inspects
    `origin/main...HEAD` rather than the uncommitted worktree.
  - ARC-2 evidence and the risk update were still added because this slice
    touched `packages/@dvt/engine/**`.
- `pnpm verify:prepush`
  - Passed.
