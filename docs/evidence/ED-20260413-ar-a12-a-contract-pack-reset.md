---
title: Close AR-A12-A engine contract-pack reset
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts
  - packages/@dvt/contracts/src/contracts/engine/RunEvents.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/engine/test/idempotency.vectors.test.ts
  - docs/architecture/components/engine/contracts/security/AuditLog.v1.md
  - scripts/generate-contract-index.cjs
  - docs/planning/closeouts/20260413-ar-a12-a-contract-pack-reset-closeout.md
evidence:
  tests:
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - node scripts/generate-spec-traceability-report.cjs
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm test:engine
    - pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts packages/@dvt/contracts/src/contracts/engine/RunEvents.v1.ts packages/@dvt/contracts/src/schemas.ts packages/@dvt/contracts/src/validation.ts packages/@dvt/engine/test/idempotency.vectors.test.ts scripts/generate-contract-index.cjs
    - pnpm lint:md
    - pnpm docs:gov:links:changed
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - ARC_JSON=arc.json node tools/ci/doc-check.mjs
    - pnpm verify:prepush
---

## Summary

`AR-A12-A` collapses the active engine-runtime contract pack to one live `v1`
line and removes the remaining alias and mixed-generation reading paths for the
touched runtime topics.

The slice keeps the repository on the pre-stable versioning policy defined in
`VERSIONING.md`: git remains the history, while the active `docs/` tree
publishes only one canonical path for the engine-runtime boundary.

## What changed

1. The active contract pack now exposes only `IWorkflowEngine.v1`,
   `IProviderAdapter.v1`, `RunEvents.v1`, `ExecutionSemantics.v1`, and
   `SignalsAndAuth.v1` as the live engine-runtime line.
2. The machine-readable run-event schemas moved onto the `v1` line, and the
   generated contract index now resolves the active `RunEvents` and
   `ExecutionSemantics` sources from `*.v1.ts`.
3. Residual references that still named retired alias surfaces were removed:
   `AuditLog.v1.md` now points at `RunEvents.v1`, and
   `generate-contract-index.cjs` no longer carries dead branches for
   `RunEventCatalog.v1.md` or `DECISION_AND_RISK_LOG_*`.
4. The planning closeout and status surfaces remain aligned to the same
   one-line contract-pack policy.

## Residual risk posture

The remaining risk is downstream consumer or documentation drift outside the
updated governed surfaces. Any consumer that still bookmarks removed `v2` or
alias paths may need manual follow-up after the reset. That residual is tracked
in the linked risk-register entry for this slice.
