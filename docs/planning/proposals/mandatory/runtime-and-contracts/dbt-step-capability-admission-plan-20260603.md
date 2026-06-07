---
title: DBT step capability admission plan
status: Proposed
date: 2026-06-03
last_reviewed: 2026-06-03
owners:
  - apps/api
  - packages/@dvt/contracts
  - packages/@dvt/adapter-temporal
planning_type: proposal
lane: C
---

# DBT Step Capability Admission Plan

## Think-First Analysis

Problem summary: a run with a `DBT_MODEL` step can be accepted by the API and
started on Temporal, then fail inside the worker with
`UNSUPPORTED_STEP_KIND:DBT_MODEL:<stepId>` when the worker was started without
the DBT profile.

Root cause: DBT step kinds are registered by the worker only when
`DVT_TEMPORAL_DBT_ENABLED=true`, but the canonical step registry currently gives
DBT steps the default empty capability profile. The start-run admission path
therefore has no contract-level reason to reject a DBT plan before dispatch.

Constraints and invariants:

- Reuse the existing `StartRun` command rail. The product behavior is still
  admitting or rejecting a run.
- Keep `@dvt/adapter-temporal` free of concrete DBT plugin imports.
- Keep DBT runtime support optional and fail closed when disabled.
- Do not move plugin execution semantics into the API or planner.
- Surface missing DBT executor support as `MISSING_CAPABILITY`, not as a late
  worker failure.
- The planning DB creation-intent preflight could not run because the local
  database reported recovery mode; no parallel rail is introduced.

Selected option: model the DBT executor as an explicit runtime capability
required by DBT step kinds, allow the Temporal adapter to declare that
capability only when the API/runtime profile is DBT-enabled, and translate
engine capability failures into canonical `plan_rejected` results.

Rejected alternatives:

- Register DBT activities in every worker. Rejected because it reintroduces the
  coupling removed by the DBT plugin profile.
- Let the worker fail and improve diagnostics only. Rejected because the run is
  already queued and the user sees a runtime failure instead of readiness.
- Import the DBT plugin package from the Temporal adapter. Rejected because the
  Temporal core adapter must remain plugin-agnostic.

## Fowler Matrix

| Scenario                                                      | Opportunity         | Fowler pattern                               | DDD owner                  | Command/query rail | Implementation surfaces                                                   | Unit or package test                    | Architecture test              | User-flow test                  | Out of scope                 |
| ------------------------------------------------------------- | ------------------- | -------------------------------------------- | -------------------------- | ------------------ | ------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ | ------------------------------- | ---------------------------- |
| DBT plan is started while Temporal runtime lacks DBT support. | Hidden authority    | Policy plus explicit capability value object | Start-run admission policy | `StartRun`         | contracts step registry, API engine bridge, Temporal adapter capabilities | contracts, planner, API service tests   | adapter DBT decoupling guard   | Manual Run Detail reproducer    | DBT CLI execution hardening  |
| API/runtime profile enables DBT support.                      | Primitive obsession | Parameter object / capability declaration    | Temporal provider adapter  | `StartRun`         | API env, provider adapter factory, dev stack env propagation              | API factory and env tests, script tests | adapter package boundary guard | First run live tests later      | Worker deployment automation |
| Engine rejects a missing runtime capability.                  | Duplicate semantics | Gateway error mapping                        | Engine start-run bridge    | `StartRun`         | `startRunEngineBridge.ts`                                                 | engine bridge error mapping test        | start-run component guide      | Run Detail readiness copy later | New rejection code           |

```feature-mechanization
version: 1
featureId: DBT-STEP-CAPABILITY-ADMISSION-20260603
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/dbt-step-capability-admission-plan-20260603.md
componentGuides:
  - apps/api/docs/start-run-application-component.md
  - apps/api/docs/start-run-runtime-composition-component.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md
userStories:
  - docs/planning/closeouts/20260603-dbt-step-capability-admission-closeout.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0057-temporal-step-activity-routing-by-capability.md
  - docs/runbooks/temporal-worker-dbt-plugin-runtime-20260414.md
allowedImplementationSurfaces:
  - apps/api/docs/start-run-application-component.md
  - apps/api/docs/start-run-runtime-composition-component.md
  - apps/api/src/application/services/startRunEngineBridge.ts
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
  - apps/api/src/plugins/env.ts
  - apps/api/test/application/services/engineStartRunUseCase.errorMapping.test.ts
  - apps/api/test/application/services/storedPlanExecutabilityValidator/capabilities.cases.ts
  - apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts
  - apps/api/test/plugins/env.test.ts
  - apps/api/test/plugins/observability.test.ts
  - docs/.manifest.json
  - docs/architecture/components/engine/contracts/capabilities/capabilities.schema.json
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md
  - docs/evidence/**
  - docs/planning/closeouts/20260603-dbt-step-capability-admission-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/dbt-step-capability-admission-plan-20260603.md
  - docs/risk-register/quality/**
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
  - packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
  - packages/@dvt/contracts/test/step-registry.test.ts
  - packages/@dvt/planner/test/unit/step-registry-integration.test.ts
  - scripts/run-dev-stack.temporal.cjs
  - scripts/run-dev-stack.test.cjs
forbiddenImplementationSurfaces:
  - apps/web/**
  - apps/temporal-worker/src/runtime/**
  - packages/@dvt/engine/src/core/**
  - packages/@dvt/temporal-dbt-plugin/**
commandQueryRails:
  - name: StartRun
    type: command
    dddOwner: Start-run admission policy
domainObjects:
  - name: StepKindExecutionProfile
    type: value object
    owner: contracts step registry
  - name: TemporalAdapterCapabilities
    type: adapter read model
    owner: Temporal provider adapter
  - name: StartRunEngineErrorMapping
    type: gateway mapper
    owner: apps/api start-run application component
fowlerSignals:
  - Hidden authority
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
cypressFlows:
  - not-applicable: API and runtime admission bug; live first-run E2E remains a later prompt slice.
completionGate:
  - pnpm docs:feature-mechanization -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
  - pnpm --filter @dvt/contracts test -- test/step-registry.test.ts
  - pnpm --filter @dvt/planner test -- test/unit/step-registry-integration.test.ts
  - pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.errorMapping.test.ts test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts
  - pnpm --filter @dvt/adapter-temporal test -- test/TemporalAdapter.startRun.test.ts
  - node scripts/run-dev-stack.test.cjs
  - pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
  - pnpm verify:prepush
redGreenCycles:
  - id: dbt-step-registry-capability
    redTest: pnpm --filter @dvt/contracts test -- test/step-registry.test.ts
    expectedFailure: DBT step execution profile does not require executor.dbt.
    patchSurfaces:
      - packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
      - packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
      - packages/@dvt/contracts/test/step-registry.test.ts
    greenTest: pnpm --filter @dvt/contracts test -- test/step-registry.test.ts
  - id: dbt-planner-policy-capability
    redTest: pnpm --filter @dvt/planner test -- test/unit/step-registry-integration.test.ts
    expectedFailure: Planner output does not include executor.dbt for DBT steps.
    patchSurfaces:
      - packages/@dvt/planner/test/unit/step-registry-integration.test.ts
    greenTest: pnpm --filter @dvt/planner test -- test/unit/step-registry-integration.test.ts
  - id: temporal-adapter-dbt-capability
    redTest: pnpm --filter dvt-api test -- test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts
    expectedFailure: API env and Temporal adapter factory do not expose DBT capability posture.
    patchSurfaces:
      - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
      - apps/api/src/plugins/env.ts
      - apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts
      - apps/api/test/plugins/env.test.ts
      - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
      - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
    greenTest: pnpm --filter dvt-api test -- test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts
  - id: start-run-engine-missing-capability-mapping
    redTest: pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.errorMapping.test.ts
    expectedFailure: Engine missing-capability error is not translated to plan_rejected.
    patchSurfaces:
      - apps/api/src/application/services/startRunEngineBridge.ts
      - apps/api/test/application/services/engineStartRunUseCase.errorMapping.test.ts
    greenTest: pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.errorMapping.test.ts
  - id: temporal-dev-stack-clean-cache-bootstrap
    redTest: node --test scripts/run-dev-stack.test.cjs
    expectedFailure: Clean local Temporal CLI cache falls back to PATH instead of SDK cached-download.
    patchSurfaces:
      - scripts/run-dev-stack.temporal.cjs
      - scripts/run-dev-stack.test.cjs
    greenTest: node --test scripts/run-dev-stack.test.cjs
symbols:
  - name: DBT_STEP_REQUIRED_CAPABILITY
    path: packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
    dddOwner: StepKindExecutionProfile
    cqRails: [StartRun]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [pnpm --filter @dvt/contracts test -- test/step-registry.test.ts]
  - name: DBT_STEP_REQUIRED_CAPABILITY
    path: packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
    dddOwner: StepKindExecutionProfile
    cqRails: [StartRun]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [pnpm --filter @dvt/contracts test -- test/step-registry.test.ts]
  - name: withRequiredCapability
    path: packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
    dddOwner: StepKindExecutionProfile
    cqRails: [StartRun]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [pnpm --filter @dvt/contracts test -- test/step-registry.test.ts]
  - name: additionalCapabilities
    path: packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
    dddOwner: TemporalAdapterCapabilities
    cqRails: [StartRun]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts
    cypressCoverage: not-applicable
    unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/TemporalAdapter.startRun.test.ts]
  - name: firstUnsupportedCapability
    path: apps/api/src/application/services/startRunEngineBridge.ts
    dddOwner: StartRunEngineErrorMapping
    cqRails: [StartRun]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.errorMapping.test.ts]
  - name: requireTemporalPackage
    path: scripts/run-dev-stack.temporal.cjs
    dddOwner: Local protected-runtime Temporal bootstrap
    cqRails: [StartRun]
    fowlerSignals: [Hidden runtime dependency]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [node --test scripts/run-dev-stack.test.cjs]
  - name: startTemporalSdkDevServer
    path: scripts/run-dev-stack.temporal.cjs
    dddOwner: Local protected-runtime Temporal bootstrap
    cqRails: [StartRun]
    fowlerSignals: [Hidden runtime dependency]
    architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature DBT-STEP-CAPABILITY-ADMISSION-20260603
    cypressCoverage: not-applicable
    unitTests: [node --test scripts/run-dev-stack.test.cjs]
```
