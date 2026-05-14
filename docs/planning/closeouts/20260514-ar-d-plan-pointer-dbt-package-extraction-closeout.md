---
title: AR-D PlanRef DBT plugin package extraction closeout
status: Final
owner: Runtime / Temporal / Architecture
last_reviewed: 2026-05-14
planning_type: closeout
task_id: AR-D-PLAN-POINTER
---

# AR-D PlanRef DBT Plugin Package Extraction Closeout

## Summary

This slice closes the remaining package-level DBT ownership drift inside
`AR-D-PLAN-POINTER`. The generic Temporal adapter package no longer exports DBT
concrete plugin symbols. DBT runtime ownership now lives in
`@dvt/temporal-dbt-plugin`, and worker/API composition roots import DBT
semantics from that package.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/reference-architecture.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md`

## Real Work Performed

- Added Fowler analysis in
  `buzon/20260514-codex-fowler-ar-d-plan-pointer-dbt-package-extraction-analysis.md`.
- Added governed implementation plan and user stories in
  `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md`.
- Added component guide and diagrams in
  `docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md`.
- Moved DBT plugin implementation and DBT CLI tests into
  `packages/@dvt/temporal-dbt-plugin`.
- Removed DBT concrete exports from `packages/@dvt/adapter-temporal/src/index.ts`.
- Updated `apps/temporal-worker` and `apps/api` to import DBT plugin semantics
  from `@dvt/temporal-dbt-plugin`.
- Added semantic package extraction guard in
  `packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts`.
- Updated active architecture docs and risk register posture.

## TDD Evidence

RED:

- `pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts`
- Expected failure: adapter root still exported DBT symbols, DBT implementation
  directory still lived under adapter-temporal, the new package was missing,
  and API/worker consumers still imported from `@dvt/adapter-temporal`.

GREEN:

- The same guard passed after package extraction.

## Validation Evidence

- `pnpm docs:feature-mechanization -- --feature AR-D-PLAN-POINTER-DBT-PACKAGE-EXTRACTION` - passed.
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts` - passed.
- `pnpm --filter @dvt/adapter-temporal exec vitest run --config vitest.config.ts test/activities.test.ts test/dbt-core-decoupling.architecture.test.ts test/dbt-package-extraction.architecture.test.ts` - passed.
- `pnpm --filter @dvt/temporal-dbt-plugin typecheck` - passed.
- `pnpm --filter @dvt/temporal-dbt-plugin test` - passed.
- `pnpm --filter @dvt/adapter-temporal test` - passed.
- `pnpm --filter dvt-temporal-worker test` - passed.

## No-Debt And No-Stub Evidence

- No stubs, placeholders, fake adapters, or TODO/FIXME markers were added.
- No lint, type, test, hook, or quality rule was relaxed.
- No `--no-verify` or hook bypass was used.
- No backwards-compatible DBT re-export was left in `@dvt/adapter-temporal`;
  the package boundary is a hardcut.

## Residual Work

DBT sandbox and dependency-isolation maturity remain future runtime-hardening
work. That is not package-level adapter coupling and remains outside this
slice.
