---
title: Hard-cut runtime provider vocabulary cleanup
status: Accepted
date: 2026-04-24
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - apps/api
  - apps/web
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/schema-packs/common.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - packages/@dvt/contracts/test/provider-vocabulary.architecture.test.ts
  - packages/@dvt/engine/src/adapters/inMemory/InMemoryProviderAdapter.ts
  - packages/@dvt/engine/src/testing.ts
  - packages/@dvt/engine/src/application/providerSelection.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedExecutionRuntime.ts
  - apps/api/test/app/protectedRuntimeComposition.test.ts
  - apps/api/test/integration/protectedRuntime.integration.shared.ts
  - scripts/run-dev-stack.cjs
  - scripts/run-dev-stack.temporal.cjs
  - scripts/run-dev-stack.test.cjs
  - apps/web/src/app/testing/contractTestUtils.ts
  - packages/@dvt/adapter-postgres/test/helpers/runEventFixtures.ts
  - docs/architecture/components/engine/adapters/index.md
  - docs/architecture/components/engine/contracts/capabilities/adapters.capabilities.json
  - docs/risk-register/quality/R-20260424-HARD-CUT-RUNTIME-PROVIDER-VOCABULARY.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- test/provider-vocabulary.architecture.test.ts
    - pnpm --filter dvt-api test -- test/modules/buildProviderAdapters.test.ts test/application/services/storedPlanExecutabilityValidator.test.ts test/entrypoints/http/recoverRunRouteParser.test.ts test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts test/application/services/startRunTargetAdapterRegistry.test.ts test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
---

# Summary

This ARC-2 evidence records the hard cut that removes `mock` and
non-implemented future-provider IDs from the active runtime provider
vocabulary. Unit tests may still use test doubles, but those doubles must model
real provider ids from the active vocabulary (`temporal`). Integration tests
must use real infrastructure or skip explicitly when the required environment
is absent.

# What changed

1. Contract and schema validation no longer advertise `mock` as an active
   runtime provider.
2. The former engine `MockAdapter` test utility is now
   `InMemoryProviderAdapter`, making its role explicit as a unit-test double
   rather than a runtime provider.
3. Active shared provider vocabulary is narrowed to the implemented provider
   runtime only.
4. Dead provider stubs are deleted from the engine source tree and no longer
   appear in the public testing barrel.
5. Active provider capability matrices, event schemas, adapter docs, C4 views,
   operational docs, and status docs no longer advertise future providers as
   executable runtime paths.
6. API and web fixtures now use real provider ids for run refs and start-run
   inputs while preserving UI-local mock data-source mode as a separate web
   concern.
7. Protected runtime integration tests no longer fall back to a provider mock;
   they require real database and Temporal configuration before they run.
8. Active architecture docs now distinguish provider test doubles from real
   runtime provider adapters.
9. Protected runtime startup now fails fast with an explicit `TEMPORAL_ADDRESS`
   configuration error before workflow-engine construction when OIDC routes are
   enabled without Temporal configuration.
10. `pnpm dev:app` now injects the canonical local Temporal posture, starts the
    standalone Temporal worker, waits for its `/readyz` probe, and fails local
    bootstrap explicitly when Temporal is unavailable.

# Validation notes

- Unit suites use provider doubles only behind real provider ids.
- Adapter-postgres integration tests skipped where the real Postgres
  environment was not configured.
- API protected runtime integration tests skipped because the required real
  database and Temporal environment were not configured.
