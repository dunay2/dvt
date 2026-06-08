---
title: Source-Grounded 24 Workspace Gap Reports Extension
status: Draft
owner: Architecture / Workspace governance
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: buzon/20260607-source-grounded-24-workspace-gap-reports.md
---

# Source-Grounded 24 Workspace Gap Reports Extension

## Purpose

This extension checks the global workspace report against the individual source
signals gathered in the deeper follow-up reports. It exists because a global
workspace report can become misleading if it treats package manifests as enough.

## Additional source checks used

- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/src/application/ports/protectedRuntimeCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimePlanCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeRunCommandQueryRails.ts`
- `apps/web/src/app/plugins/registry.ts`
- `apps/web/src/app/plugins/dvt/dvtContributions.ts`
- `apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts`
- `apps/web/src/app/views/canvas/canvasPlanReadiness.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/delivery/src/application/OutboxWorker.ts`
- `packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts`
- `packages/@dvt/observability-otel/src/OtelObservability.ts`
- `packages/@dvt/cli/src/index.ts`

## Corrections to the global report

### 1. The global report should not flatten maturity

The source shows three different kinds of workspace maturity:

1. **Implemented and governed by executable catalogs**
   - `dvt-api` has route constants and protected runtime C/Q rail catalog.
   - `@dvt/web` has route/plugin projection, DVT node kinds, local readiness,
     and formal frontend C/Q rail inventory.
   - `@dvt/contracts` has real generic graph and graph-draft contracts.

2. **Implemented but needing public surface/lifecycle matrices**
   - `@dvt/engine`
   - `@dvt/planner`
   - `@dvt/adapter-temporal`
   - `@dvt/adapter-postgres`
   - `@dvt/delivery`
   - `@dvt/artifacts`
   - `@dvt/traceability-service`

3. **Risk or posture mismatch**
   - `@dvt/plan-verifier` and `@dvt/state-store` use `--passWithNoTests` posture.
   - `@dvt/observability-otel` source declares scaffold/noop behavior.
   - `@dvt/cli` says `userFacingCli: false` but package metadata is `private: false`.
   - `@dvt/crypto` is physically located under `packages/@dvt/canonical`.

### 2. The strongest global gap is not package existence

Every important package exists. The real global gaps are:

- workspace registry/count truth;
- generated public surface matrices;
- lifecycle/SLO/idempotency matrices;
- product-flow proof;
- generic DVT node-kind proof across contracts/planner/verifier/interpreter/runtime;
- explicit test posture for packages that can pass without tests.

### 3. The 24/25 workspace ambiguity should be a first-class remediation task

The source-derived inventory can list 25 physical workspace entries if `@dvt/cli`
is counted. The user expectation says 24. The correct remediation is to stop
hardcoding the count and generate it from a registry with inclusion policy.

## Revised global classification table

| Workspace                   | Source-backed status                                     | Primary unresolved gap                             |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `dvt-api`                   | Real route constants + C/Q rail catalog                  | Generate frontend/product projections from catalog |
| `@dvt/web`                  | Real plugin/router/canvas command surfaces               | Close product workflow and typed node config       |
| `@dvt/contracts`            | Real generic graph + graph draft contracts               | Specs publication and fixture expansion            |
| `@dvt/engine`               | Stable API and compact `IWorkflowEngine`                 | Public surface matrix and CQRS guard               |
| `@dvt/planner`              | `PlannerFacade` sole public entry, deterministic planner | Dbt default split and transitional exports         |
| `@dvt/dsl`                  | Tiny deterministic v1 equality grammar                   | Expressiveness and typed diagnostics               |
| `@dvt/plan-verifier`        | Real verifier code                                       | Test posture and structured diagnostics            |
| `@dvt/plan-interpreter`     | Real DAG/layer implementation                            | Fixture taxonomy and adapter parity proof          |
| `@dvt/adapter-temporal`     | Real deterministic workflow + activity dispatch          | Workflow/activity/capability matrix                |
| `@dvt/adapter-postgres`     | Broad state-store adapter                                | Migration authority and tenant test matrix         |
| `@dvt/delivery`             | Real outbox/projector runtime                            | Delivery guarantee and lifecycle contracts         |
| `@dvt/state-store`          | Archive lifecycle-heavy package                          | Boundary clarity and tests                         |
| `@dvt/traceability-service` | Governance + runtime lineage exports                     | Role split and DB alignment                        |
| `@dvt/artifacts`            | Real artifact storage/read/write boundary                | Lifecycle and generic/dbt split                    |
| `@dvt/observability`        | Real interface + cardinality policy                      | Signal catalogue and adoption checks               |
| `@dvt/observability-otel`   | Scaffold/noop adapter                                    | Implement real OTel or rename posture              |
| `@dvt/cli`                  | Internal validation/golden surface                       | Visibility and command contract                    |
| `@dvt/crypto`               | Real package under canonical path                        | Name/path/count ADR                                |
| workers                     | Real composition roots                                   | Admin/SLO contracts and lifecycle proof            |

## Updated global remediation sequence

1. Create workspace registry and resolve count/identity drift.
2. Generate API route/rail projection from source catalog.
3. Generate web action/product closure matrix from frontend rail inventory.
4. Generate public surface matrices for broad barrels.
5. Close verifier/state-store test posture.
6. Build generic DVT source-transform-sink golden proof.
7. Add runtime lifecycle/SLO/idempotency matrices.
8. Align traceability/artifacts/observability with DB-first documentation.

## Closeout

The global report should be read as a dispatch map, not a final audit. The source
extensions now show that the repo is stronger in API/Web/Contracts than the first
pass implied, while still exposing hard product and governance gaps.
