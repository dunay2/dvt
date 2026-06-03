---
title: WE-HX-5 provider telemetry seams closeout
status: Accepted
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: closeout
---

# WE-HX-5 Provider Telemetry Seams Closeout

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- `docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md`
- `ADR-0003`, `ADR-0014`, `ADR-0034`

## Fowler Analysis

`WE-HX-5` closes the Fowler signals called out by the branch analysis: repeated
provider lookup, cross-cutting telemetry in an application coordinator, and
documentation drift around provider and telemetry ownership. Mature service
layer systems keep lookup semantics and instrumentation policy behind named
application seams so business coordinators remain orchestration-only.

The governing rails are internal engine commands: `EngineProviderResolution`
and `StartRunTelemetryPolicy`. No parallel public command, query, route,
adapter, or contract was introduced.

## Work Performed

- Added Fowler mailbox analysis in
  `buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md`.
- Added local component guide with public API, invariants, transitions,
  consumers, and diagrams.
- Added WE-HX-5 user stories covering provider resolution, missing providers,
  start telemetry, success telemetry, failure separation, and drift guards.
- Added `IEngineProviderResolver` and `MapBackedEngineProviderResolver`.
- Routed start-run admission, cancel, signal, and enrichment provider lookup
  through the resolver seam.
- Added `StartRunTelemetryPolicy` and moved start/success telemetry out of
  `StartRunApplicationService`.
- Added a semantic architecture test for provider and telemetry ownership.
- Updated target architecture documentation to reflect the closed drift.

## Validation Evidence

- Red:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts`
  failed because the resolver and telemetry policy did not yet exist.
- Feature mechanization:
  `pnpm docs:feature-mechanization -- --feature WE-HX-5-PROVIDER-TELEMETRY-SEAMS`
  passed.
- Green architecture:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts`
  passed with 3 tests.
- Resolver behavior:
  `pnpm --filter @dvt/engine test -- test/application/providerSelection.test.ts`
  passed with 11 tests.
- Start-run behavior:
  `pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts`
  passed with 6 tests.
- Typecheck:
  `pnpm --filter @dvt/engine typecheck` passed.
- Engine package:
  `pnpm --filter @dvt/engine test` passed with 54 test files and 410 tests.
- Mechanization implementation:
  `pnpm docs:feature-mechanization:implementation` passed.
- Traceability:
  `pnpm traceability:adr0` passed and regenerated `traceability.manifest.json`.
- Governance DB:
  `pnpm governance:db:import; pnpm governance:db:check` passed.
- Governance refresh:
  `pnpm governance:refresh` was run and failed at `governance:db:check` after
  its internal import left stale rows from a previous branch in the local
  governance DB. A direct canonical `governance:db:import` followed by
  `governance:db:check` passed.
- ARC probe:
  `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` ran before
  commit and reported ARC-0 because uncommitted working-tree changes are not in
  `HEAD`; ARC-2 evidence and risk files were created proactively for the engine
  PR policy.
- Pre-push:
  `pnpm verify:prepush` passed.

## ADR Decision

No new ADR is required. The slice applies existing ADR-backed direction for
engine-owned execution semantics, run-driven provider adapters, and bounded
context communication. It does not change public contracts, provider adapter
contracts, events, or compatibility behavior.

## No-Debt And No-Stub Evidence

- No public workflow-engine contract was changed.
- No placeholder adapter, fake success path, temporary bypass, TODO, or FIXME
  was added.
- No lint, type, test, docs, ARC, or hook rule was relaxed.
