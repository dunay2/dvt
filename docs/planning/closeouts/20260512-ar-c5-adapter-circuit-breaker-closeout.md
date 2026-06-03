---
title: AR-C5 adapter circuit breaker closeout
status: Accepted
owner: Architecture / Engine / Runtime Safety
date: 2026-05-12
planning_type: closeout
---

# AR-C5 Adapter Circuit Breaker Closeout

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c5-adapter-circuit-breaker-plan-20260512.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`

## Real Work Performed

- Added `CircuitBreakingProviderAdapter` and protected registry composition in
  `@dvt/engine`.
- Added breaker posture to `IRunHealthService` and `RunHealthService`.
- Wrapped production API runtime adapters through
  `buildCircuitBreakingAdapterRegistry`.
- Added AR-C5 component guide, user stories, Fowler analysis in `buzon`, ARC-2
  evidence, and risk register entry.

## Validation Evidence

Commands run before this closeout was authored:

- `pnpm docs:feature-mechanization -- --feature AR-C5-ADAPTER-CIRCUIT-BREAKING` - passed.
- `pnpm --filter @dvt/engine test -- test/architecture/adapterCircuitBreaker.architecture.test.ts` - red first, failed because the decorator and wiring did not exist.
- `pnpm --filter @dvt/engine test -- test/adapters/CircuitBreakingProviderAdapter.test.ts` - red first, failed because the decorator module did not exist.
- `pnpm --filter @dvt/engine test -- test/adapters/CircuitBreakingProviderAdapter.test.ts test/architecture/adapterCircuitBreaker.architecture.test.ts` - passed.
- `pnpm --filter dvt-api test -- test/application/services/WorkflowEngineFactory.test.ts` - passed.
- `pnpm --filter @dvt/engine typecheck` - passed.
- `pnpm --filter dvt-api typecheck` - passed.
- `pnpm --filter @dvt/engine test` - passed, 56 files / 419 tests.
- `pnpm --filter dvt-api test` - passed, 120 files / 599 tests, with the
  existing protected runtime integration suite skipped by config.
- `pnpm docs:status:generate` - passed.
- `pnpm docs:sync` - passed.
- `pnpm governance:refresh` - passed after a governance DB refresh/import
  cleared stale query-store rows.
- `pnpm docs:feature-mechanization:implementation` - passed after the AR-C5
  manifest declared all new production and test symbols.

Review feedback incorporated:

- Replaced the initial architecture guard that inspected source files with a
  semantic architecture test that imports the breaker API, exercises fail-fast
  behavior, validates protected registry composition, and reads health posture.
- Kept documentation proof under feature mechanization/docs sync instead of
  source-file string checks.

## No-Debt Evidence

- No TODO, FIXME, placeholder, fake adapter, or fake success path was added.
- No lint, type, test, hook, ARC, or quality rule was disabled or relaxed.
- No `--no-verify` or hook bypass was used.
- No backup branch or backup file was created.

## No-Stub Evidence

- The breaker is implemented as production code and wired into API production
  composition.
- The health posture is returned by the runtime health service, not documented
  only.
- Tests cover fail-fast, half-open recovery, health posture, metrics, and
  semantic architecture ownership.
