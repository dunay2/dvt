---
title: RC-G1-B4 engine shared-kernel hardening
status: Accepted
date: 2026-04-11
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v2.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
  - eslint.config.cjs
  - docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md
  - docs/planning/state/agent-lane-a.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md" "docs/evidence/ED-20260411-rc-g1-b4-engine-shared-kernel-hardening.md"
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:planning:generated:check
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# ED-20260411 RC-G1-B4 engine shared-kernel hardening

## Decision captured

This evidence closes `RC-G1-B4`, the hardening slice for the engine-owned
contract migration under `RC-G1-B`.

The slice did not move additional ports. It removed the remaining legacy shared
publication surface and added regression guards so engine-owned behavioral ports
do not leak back through `@dvt/contracts`.

## What this evidence proves

1. `@dvt/contracts` no longer publishes the remaining equivalent engine-owned
   behavioral ports through its root barrel.
2. The final residual TypeScript consumer importing an equivalent engine-owned
   port from `@dvt/contracts` has been cut over to `@dvt/engine`.
3. Lint guards now fail governed consumers that attempt to import engine-owned
   behavioral ports from `@dvt/contracts`.
4. The active proposal and Lane A tracker both mark `RC-G1-B` as closed and
   leave `RC-G1-C` and `RC-G1-D` as the remaining work.

## Validation results

- `pnpm --filter @dvt/contracts build`
  - Passed.
- `pnpm --filter @dvt/contracts test`
  - Passed.
- `pnpm --filter @dvt/adapter-temporal build`
  - Passed.
- `pnpm --filter @dvt/adapter-temporal test`
  - Passed.
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md" "docs/evidence/ED-20260411-rc-g1-b4-engine-shared-kernel-hardening.md"`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:planning:generated:check`
  - Passed.
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
  - Passed.
  - Result: `effectiveArcLevel = ARC-2`, `evidenceDoc = true`, `riskUpdate = true`.
- `pnpm verify:prepush`
  - Passed.
