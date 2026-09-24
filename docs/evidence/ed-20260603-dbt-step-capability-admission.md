---
title: DBT step capability admission
status: Accepted
date: 2026-06-03
owners:
  - packages/@dvt/contracts
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - apps/api/src/application/services/startRunEngineBridge.ts
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- test/step-registry.test.ts
    - pnpm --filter @dvt/planner test -- test/unit/step-registry-integration.test.ts
    - pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.errorMapping.test.ts test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- test/TemporalAdapter.startRun.test.ts
    - node scripts/run-dev-stack.test.cjs
---

# DBT step capability admission

This evidence records the fail-closed admission fix for DBT plan steps. DBT
step kinds now require `executor.dbt`; the API declares that capability for the
Temporal adapter only when the DBT runtime profile is enabled; and engine
missing-capability errors are translated into canonical `plan_rejected`
responses before worker dispatch.

The change keeps `@dvt/adapter-temporal` plugin-agnostic. Dynamic plugin
capabilities are injected by runtime composition; DBT activity registration
still belongs to the optional worker DBT profile.
