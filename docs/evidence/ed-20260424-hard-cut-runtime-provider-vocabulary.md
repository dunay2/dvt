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
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - packages/@dvt/contracts/test/provider-vocabulary.architecture.test.ts
  - packages/@dvt/engine/src/adapters/inMemory/InMemoryProviderAdapter.ts
  - packages/@dvt/engine/src/testing.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedExecutionRuntime.ts
  - apps/api/test/integration/protectedRuntime.integration.shared.ts
  - apps/web/src/app/testing/contractTestUtils.ts
  - packages/@dvt/adapter-postgres/test/helpers/runEventFixtures.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/state-store test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
---

# Summary

This ARC-2 evidence records the hard cut that removes `mock` from the active
runtime provider vocabulary. Unit tests may still use test doubles, but those
doubles must model real provider ids such as `temporal` or `conductor`.
Integration tests must use real infrastructure or skip explicitly when the
required environment is absent.

# What changed

1. Contract and schema validation no longer advertise `mock` as an active
   runtime provider.
2. The former engine `MockAdapter` test utility is now
   `InMemoryProviderAdapter`, making its role explicit as a unit-test double
   rather than a runtime provider.
3. API and web fixtures now use real provider ids for run refs and start-run
   inputs while preserving UI-local mock data-source mode as a separate web
   concern.
4. Protected runtime integration tests no longer fall back to a provider mock;
   they require real database and Temporal configuration before they run.
5. Active architecture docs now distinguish provider test doubles from real
   runtime provider adapters.

# Validation notes

- Unit suites use provider doubles only behind real provider ids.
- Adapter-postgres integration tests skipped where the real Postgres
  environment was not configured.
- API protected runtime integration tests skipped because the required real
  database and Temporal environment were not configured.
