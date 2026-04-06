---
slice: mw-a2-b-contract-cleanup
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A2-B Shared Contract Cleanup

## Think-First Analysis

- Problem summary:
  The planner boundary had already moved to `GenericGraphSourceV1`, but one
  legacy public type alias (`DbtManifestLike`) still remained exported in
  contracts, keeping historical graph-source semantics visible in the active
  contract surface.
- Root cause:
  Contract cleanup lagged behind planner/API migration waves and left a
  compatibility-oriented type in the root barrel.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md`.
- Selected option:
  Remove remaining legacy alias from the active contract export surface and lock
  the expectation with contract tests.

## Pre-Implementation Brief

- Mode:
  Full (contracts + planning closeout)
- Scope:
  Close `MW-A2-B` by ensuring GenericGraphSourceV1 remains the only active
  planner graph-source contract surface in public exports.
- Touched paths:
  `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`,
  `packages/@dvt/contracts/src/index.ts`,
  `packages/@dvt/contracts/test/planner.contract.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a2-b-contract-cleanup-closeout.md`.
- Out-of-scope:
  Planner/API runtime behavior changes already covered by `MW-A2-C/D/E`.

## Delivered Contract State

- Removed `DbtManifestLike` from planner contract declarations.
- Removed `DbtManifestLike` from root `@dvt/contracts` exports.
- Added contract test guard that root index no longer exports
  `DbtManifestLike`.

## Validation Evidence

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter dvt-api test`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No placeholders/stubs/fake paths were introduced.
- No hooks or quality gates were bypassed.
- No lint/type/test rules were relaxed.
