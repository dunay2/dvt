---
title: AR-D plan pointer DBT plugin package extraction plan
status: Active
owner: Runtime / Temporal / Architecture
last_reviewed: 2026-05-14
planning_type: proposal
lane: D
task_id: AR-D-PLAN-POINTER
---

# AR-D Plan Pointer DBT Plugin Package Extraction Plan

## Think-First Analysis

### Problem Summary

`AR-D-PLAN-POINTER` has corrected the workflow payload boundary, but the
Temporal adapter package still exports concrete DBT plugin and CLI runner
symbols from its root API. That keeps package-level DBT ownership inside the
generic Temporal adapter surface.

### Root Cause

The earlier remediation split runtime responsibilities inside
`src/plugins/dbt`, but stopped at the module boundary. The package boundary did
not move, so concrete DBT semantics still share the `@dvt/adapter-temporal`
public API with generic Temporal orchestration.

### Constraints And Invariants

- ADR-0003: DVT owns execution semantics; provider adapters do not define
  product semantics.
- ADR-0014: adapters execute run-driven provider work behind DVT-owned
  contracts.
- ADR-0046: execution-plan definition stays separate from runtime execution
  policy.
- `docs/architecture/command-query-rail-governance.md`: no new externally
  observable command or query is introduced; this is package API and worker
  composition governance.
- `docs/architecture/fowler-opportunity-planning-governance.md`: package
  boundary drift requires a planning matrix, architecture guard, and docs.

### Options Considered

| Option                                                       | Decision                | Reason                                                                                   |
| ------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| Keep DBT under `@dvt/adapter-temporal` and improve docs      | Rejected                | Documentation cannot fix a misleading package API.                                       |
| Re-export DBT from `@dvt/adapter-temporal` for compatibility | Rejected                | This is the old drift; the requested cut is hardcut.                                     |
| Create `@dvt/temporal-dbt-plugin` and update consumers       | Selected                | Preserves generic adapter API and gives DBT its own component boundary.                  |
| Extract generic plugin ports to a third package first        | Rejected for this slice | Larger blast radius; the current generic ports are already adapter-owned and sufficient. |

### Selected Option And Rationale

Create `@dvt/temporal-dbt-plugin` as the DBT-owned package, move the DBT
manifest/activity/runner/helper modules there, update API and worker consumers,
and remove concrete DBT exports from `@dvt/adapter-temporal`.

## Pre-Implementation Brief

- Mode: Full.
- Scope: package extraction, consumer imports, semantic architecture guards,
  component docs, planning/evidence/risk closeout.
- Expected outcome: `@dvt/adapter-temporal` root API publishes generic Temporal
  adapter/plugin ports only; DBT symbols are published from
  `@dvt/temporal-dbt-plugin`.
- Risks and mitigations:
  - Build ordering: new package depends on `@dvt/adapter-temporal`; validate
    package build and typecheck.
  - Test relocation: DBT unit tests move with the package; generic adapter tests
    retain only plugin-neutral assertions.
  - Docs drift: update active component guides and system status in the same
    slice.
- Out of scope:
  - DBT sandbox isolation.
  - Tenant-specific DBT runtime packaging.
  - Moving generic Temporal plugin ports to a third package.
- Validation plan:
  - `pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts`
  - `pnpm --filter @dvt/temporal-dbt-plugin test`
  - `pnpm --filter @dvt/adapter-temporal test`
  - `pnpm --filter dvt-temporal-worker test`
  - `pnpm --filter dvt-api test -- ArtifactStoreDbtProjectBundleBindingPolicy`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`
- Test coverage plan:
  - architecture guard rejects DBT exports from `@dvt/adapter-temporal`;
  - architecture guard requires the DBT package manifest, docs, and consumer
    imports;
  - package unit tests keep DBT CLI runner behavior green after move;
  - worker tests prove DBT profile composition still works.
- Libraries evaluated: none adopted; this is package boundary extraction using
  existing TypeScript workspace packages.
- Command/query rail impact: no new external rail. Existing start-run admission
  continues to consume the DBT manifest for artifact binding.

## Fowler Planning Matrix

| Scenario                               | Opportunity             | Fowler pattern                 | DDD owner                   | Command/query rail                        | Implementation surfaces                                                              | Unit/package test               | Architecture test                             | User-flow test | Out of scope                   |
| -------------------------------------- | ----------------------- | ------------------------------ | --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------- | --------------------------------------------- | -------------- | ------------------------------ |
| Adapter public API stops exporting DBT | Boundary drift          | Separate Plugin from Core      | Temporal adapter public API | none - package API governance only        | `packages/@dvt/adapter-temporal/src/index.ts`                                        | adapter typecheck               | `dbt-package-extraction.architecture.test.ts` | Not applicable | Generic plugin port extraction |
| DBT plugin owns manifest and runner    | Responsibility overload | Plugin + Gateway               | Temporal DBT plugin package | none - internal worker plugin composition | `packages/@dvt/temporal-dbt-plugin/**`                                               | `@dvt/temporal-dbt-plugin test` | `dbt-package-extraction.architecture.test.ts` | Not applicable | Sandbox isolation              |
| Worker composes DBT through package    | Duplicate semantics     | Service Layer composition root | Temporal worker DBT profile | none - worker composition only            | `apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts`                       | `dvt-temporal-worker test`      | worker SRP architecture test                  | Not applicable | Worker topology changes        |
| API admission consumes DBT manifest    | Hidden authority        | Published Language             | DBT plugin manifest         | existing start-run admission              | `apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts` | API policy test                 | package extraction architecture guard         | Not applicable | New route behavior             |
| Docs match shipped package truth       | Documentation drift     | Single Source of Truth         | Runtime architecture docs   | none - docs only                          | docs, evidence, risk, closeout                                                       | docs gates                      | semantic architecture guard                   | Not applicable | Historical evidence rewrites   |

## User Stories

### US-AR-D-DBT-001 - Adapter consumer sees a generic Temporal API

As an adapter consumer, I want `@dvt/adapter-temporal` to expose only generic
Temporal adapter and plugin ports, so that DBT is not mistaken for core adapter
behavior.

Acceptance:

- `packages/@dvt/adapter-temporal/src/index.ts` has no DBT concrete exports.
- The adapter package contains no `src/plugins/dbt` implementation directory.
- Generic plugin ports remain exported.

### US-AR-D-DBT-002 - Worker composes DBT from a DBT-owned package

As a Temporal worker operator, I want DBT support to be enabled by importing
`@dvt/temporal-dbt-plugin`, so that DBT runtime dependencies are visibly
optional and package-owned.

Acceptance:

- `apps/temporal-worker` depends on `@dvt/temporal-dbt-plugin`.
- `temporalWorkerDbtProfile.ts` imports DBT symbols from that package.
- DBT disabled mode still omits DBT registry wiring.

### US-AR-D-DBT-003 - API admission uses the DBT plugin manifest

As an API admission maintainer, I want DBT artifact binding to use the DBT
plugin manifest package, so that API policy does not treat the Temporal adapter
as the owner of DBT executable step kinds.

Acceptance:

- API DBT artifact binding imports `DBT_PLUGIN_ID` and executable step kinds
  from `@dvt/temporal-dbt-plugin`.
- No API route behavior changes.

### US-AR-D-DBT-004 - Drift is mechanically guarded

As an architect, I want package extraction checked by a semantic architecture
test, so future changes cannot reintroduce DBT concrete exports into the core
Temporal adapter root API.

Acceptance:

- Architecture test fails when `@dvt/adapter-temporal` root exports DBT.
- Architecture test fails when the DBT package guide is missing API,
  invariants, transitions, consumers, diagrams, or drift guards.

```feature-mechanization
version: 1
featureId: AR-D-PLAN-POINTER-DBT-PACKAGE-EXTRACTION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md
componentGuides:
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - buzon/20260514-codex-fowler-ar-d-plan-pointer-dbt-package-extraction-analysis.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md
  - docs/architecture/components/engine/adapters/temporal/temporal-step-plugin-profile.md
  - docs/architecture/system-delivery-status.md
  - docs/planning/closeouts/20260514-ar-d-plan-pointer-dbt-package-extraction-closeout.md
  - docs/evidence/ed-20260514-ar-d-plan-pointer-dbt-package-extraction.md
  - docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml
  - docs/planning/status/**
  - packages/@dvt/adapter-temporal/package.json
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/**
  - packages/@dvt/adapter-temporal/test/**
  - packages/@dvt/temporal-dbt-plugin/**
  - apps/temporal-worker/package.json
  - apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts
  - apps/temporal-worker/test/**
  - apps/api/package.json
  - apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts
  - apps/api/test/**
  - package.json
  - pnpm-lock.yaml
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/src/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/routes/**
commandQueryRails:
  - name: StartRunAdmission
    type: command
    dddOwner: Run admission policy
  - name: none - package API governance only
    type: query
    dddOwner: Temporal adapter public API
domainObjects:
  - name: TemporalDbtPluginPackage
    type: component
    owner: Runtime / Temporal
  - name: TemporalStepPluginProfile
    type: port
    owner: Runtime / Temporal
fowlerSignals:
  - Boundary Drift
  - Responsibility Overload
  - Duplicate Semantics
  - Hidden Authority
  - Documentation Drift
architectureGuards:
  - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
cypressFlows:
  - Not applicable - package API and worker composition only
completionGate:
  - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - pnpm --filter @dvt/temporal-dbt-plugin test
  - pnpm --filter @dvt/adapter-temporal test
  - pnpm --filter dvt-temporal-worker test
  - pnpm --filter dvt-api test -- ArtifactStoreDbtProjectBundleBindingPolicy
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm docs:feature-mechanization -- --feature AR-D-PLAN-POINTER-DBT-PACKAGE-EXTRACTION
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: dbt-package-extraction-guard
    redTest: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    expectedFailure: Adapter root still exports DBT symbols and DBT package does not exist yet.
    patchSurfaces:
      - packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
      - packages/@dvt/adapter-temporal/src/index.ts
      - packages/@dvt/temporal-dbt-plugin/**
      - apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts
      - apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts
    greenTest: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
symbols:
  - name: TemporalDbtPluginPackage
    path: packages/@dvt/temporal-dbt-plugin/src/index.ts
    dddOwner: TemporalDbtPluginPackage
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/temporal-dbt-plugin test
  - name: DbtStepActivity
    path: packages/@dvt/temporal-dbt-plugin/src/index.ts
    dddOwner: TemporalDbtPluginPackage
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/temporal-dbt-plugin test
  - name: DbtCliPluginRunner
    path: packages/@dvt/temporal-dbt-plugin/src/index.ts
    dddOwner: TemporalDbtPluginPackage
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/temporal-dbt-plugin test
  - name: createDbtStepActivityRegistry
    path: packages/@dvt/temporal-dbt-plugin/src/index.ts
    dddOwner: TemporalDbtPluginPackage
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/temporal-dbt-plugin test
  - name: assertDbtCliAvailable
    path: packages/@dvt/temporal-dbt-plugin/src/index.ts
    dddOwner: TemporalDbtPluginPackage
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/temporal-dbt-plugin test
  - name: ActivityErrorCode
    path: packages/@dvt/adapter-temporal/src/index.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal test
  - name: createPermanentStepFailure
    path: packages/@dvt/adapter-temporal/src/index.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal test
  - name: dbtPackageExtractionGuard
    path: packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - name: ADAPTER_ROOT
    path: packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - name: DBT_PLUGIN_ROOT
    path: packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - name: DBT_PLUGIN_COMPONENT_GUIDE
    path: packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
  - name: DBT_PLUGIN_ROOT
    path: packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Documentation Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts
  - name: temporalDbtPluginSourceEntry
    path: packages/@dvt/adapter-temporal/vitest.config.ts
    dddOwner: Temporal adapter public API
    cqRails:
      - none - package API governance only
    fowlerSignals:
      - Boundary Drift
    architectureGuard: pnpm --filter @dvt/adapter-temporal test
    cypressCoverage: Not applicable - package API only
    unitTests:
      - pnpm --filter @dvt/adapter-temporal test
```
