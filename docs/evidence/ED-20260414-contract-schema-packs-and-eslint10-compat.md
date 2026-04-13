---
title: Refactor contract schema packs and harden ESLint 10 import compatibility
status: Accepted
date: 2026-04-14
owners:
  - packages/@dvt/contracts
  - apps/api
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/schema-packs/common.ts
  - packages/@dvt/contracts/src/schema-packs/run-events.ts
  - packages/@dvt/contracts/src/schema-packs/planner.ts
  - packages/@dvt/contracts/src/schema-packs/planner-context.ts
  - packages/@dvt/contracts/src/schema-packs/planner-graph.ts
  - packages/@dvt/contracts/src/schema-packs/execution-plan.ts
  - packages/@dvt/contracts/src/schema-packs/planner-build.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview.ts
  - packages/@dvt/contracts/src/schema-packs/start-run.ts
  - packages/@dvt/contracts/src/schema-packs/plan-records.ts
  - packages/@dvt/contracts/src/schema-packs/shared.ts
  - packages/@dvt/contracts/src/validation.ts
  - eslint.config.cjs
  - package.json
  - pnpm-lock.yaml
  - apps/api/src/application/services/storedExecutablePlan.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
evidence:
  tests:
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm lint
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm exec markdownlint-cli2 "docs/evidence/ED-20260414-contract-schema-packs-and-eslint10-compat.md" "docs/risk-register/quality/R-20260414-CONTRACT-SCHEMA-PACK-LINT-COMPAT.yaml" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc
    - pnpm verify:prepush
---

## Summary

This slice turns `packages/@dvt/contracts/src/schemas.ts` into a public facade
over responsibility-scoped schema packs and removes the prior single-file
schema monolith.

The same slice also hardens repository lint execution under `eslint@10` by
wrapping `eslint-plugin-import` rule exports through `@eslint/compat`, then
fixes the repo-wide lint findings that surfaced once the crash was removed.

## What changed

1. `schemas.ts` now re-exports schema packs grouped by responsibility instead
   of defining planner, run-event, and plan-record schemas in one file.
2. `plan-records` now depends on `execution-plan` directly instead of importing
   through the planner barrel, reducing accidental coupling.
3. `planner.ts` is now an internal barrel over smaller modules rather than the
   implementation home for multiple planner boundaries.
4. The root ESLint flat config now adapts `eslint-plugin-import` rules via
   `fixupPluginRules`, allowing `pnpm lint` to complete under the installed
   ESLint 10 toolchain.
5. The repo-wide lint cleanup touched API, engine, adapter-postgres, and web
   files only where the stricter or now-functional lint stack required it.

## Residual risk posture

The schema split keeps the public contract surface stable, but there is still
residual tooling risk while the repository relies on the ESLint compatibility
shim for `eslint-plugin-import` instead of native upstream ESLint 10 support.
