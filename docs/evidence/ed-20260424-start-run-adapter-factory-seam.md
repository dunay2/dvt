---
title: Start-run adapter factory seam hardening
status: Accepted
date: 2026-04-24
owners:
  - apps/api
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts
  - packages/@dvt/contracts/test/start-run-boundary.contract.test.ts
  - packages/@dvt/contracts/test/start-run-boundary.architecture.test.ts
  - apps/api/src/modules/buildProviderAdapters.ts
  - apps/api/src/modules/providerAdapters/providerAdapterFactory.ts
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedExecutionRuntime.ts
  - apps/api/test/modules/buildProviderAdapters.cases.ts
  - docs/risk-register/quality/R-20260424-START-RUN-ADAPTER-FACTORY-DRIFT.yaml
evidence:
  tests:
    - pnpm --filter dvt-api test -- test/modules.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test -- test/modules.test.ts test/entrypoints/http/startRunRoute.authAndSuccess.test.ts test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts test/entrypoints/http/startRunRoute.validation.test.ts test/entrypoints/http/startRunRouteCommandBuilder.test.ts test/entrypoints/http/planRouteParserHelpers.test.ts test/entrypoints/http/startRunIdentity.architecture.test.ts test/application/services/PlannerBackedStartRunUseCase.test.ts test/application/services/engineStartRunUseCase.commandPath.test.ts test/application/services/engineStartRunUseCase.errorMapping.test.ts test/application/services/BackpressureAwareStartRunUseCase.admissionModes.test.ts
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
---

# Summary

This ARC-2 evidence covers the hard cut that removes `mock` from the active
`startRun` target-adapter contract while keeping Temporal as a replaceable
provider adapter rather than embedding Temporal construction in generic
runtime assembly.

# What this evidence closes

1. `StartRunBoundary.v1` exposes only the active `temporal` target-adapter ID,
   and contract tests now reject both `mock` and undeclared adapters.
2. `buildProviderAdapters` no longer imports `@dvt/adapter-temporal` or reads
   Temporal-specific environment variables. It builds the adapter map from
   explicit `ProviderAdapterFactory` implementations.
3. `createTemporalProviderAdapterFactory` owns Temporal adapter package
   configuration and lifecycle closure behind the generic factory seam.
4. API docs and contract guides now state that `temporal` is an adapter ID, not
   DVT execution semantics.

# What remains open

1. Broader provider vocabulary still contains non-start-run provider IDs in
   engine/test surfaces. Those are outside this slice and remain separate from
   the active `startRun.targetAdapter` contract.
2. Adding a second real runtime adapter must add a new provider factory,
   contract coverage, docs updates, and ARC evidence before it is advertised.
