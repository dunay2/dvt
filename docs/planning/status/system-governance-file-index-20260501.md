---
title: System Governance File Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance File Index

## Purpose

This is the human summary for the exhaustive file-level governance index. The
machine-readable source is:

- [system-governance-file-index.files.yaml](./system-governance-file-index.files.yaml)
- [system-governance-file-fingerprint-baseline.yaml](./system-governance-file-fingerprint-baseline.yaml)

Every tracked repository file has one row in that YAML file. Each row records
the stable file id, path hash, content hash, governance hash, state
fingerprint, root unit, domain unit, component unit, owning unit, unit path,
governing documents, DDD owner, command/query rail posture, drift status, and
legacy status. The fingerprint baseline is the accepted drift-control snapshot
used by CI.

## Totals

- Tracked files indexed: 4041
- Component/source owner units: 20
- Ungoverned files: 0
- Drift files: 44
- Legacy files: 9

## By Status

<!-- prettier-ignore-start -->
| Status | Files |
| --- | ---: |
| `canonical` | 111 |
| `coverage-required` | 3823 |
| `drift` | 44 |
| `legacy` | 9 |
| `review` | 54 |
<!-- prettier-ignore-end -->

## By Owning Unit

<!-- prettier-ignore-start -->
| Owning unit | Files |
| --- | ---: |
| `SYS-ADAPTERS-ROOT` | 196 |
| `SYS-API-ROOT` | 362 |
| `SYS-CI-GOVERNANCE-ROOT` | 168 |
| `SYS-CONTRACTS-ROOT` | 127 |
| `SYS-DOCS-GOVERNANCE-ROOT` | 1642 |
| `SYS-OBSERVABILITY-ROOT` | 15 |
| `SYS-PLANNER-ROOT` | 76 |
| `SYS-PLANSTORE-API-COMPOSITION` | 20 |
| `SYS-PLANSTORE-ARTIFACTS-PORTS` | 23 |
| `SYS-PLANSTORE-CONTRACTS` | 3 |
| `SYS-PLANSTORE-DOCS-RISK` | 31 |
| `SYS-PLANSTORE-ENGINE-FETCH` | 5 |
| `SYS-PLANSTORE-POSTGRES` | 16 |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | 9 |
| `SYS-REPO-METADATA-ROOT` | 111 |
| `SYS-RUNTIME-ROOT` | 286 |
| `SYS-TRACEABILITY-ROOT` | 65 |
| `SYS-WEB-ROOT` | 783 |
| `SYS-WORKERS-ROOT` | 103 |
<!-- prettier-ignore-end -->

## Drift And Legacy Files

<!-- prettier-ignore-start -->
| File | Owning unit | Status |
| --- | --- | --- |
| `apps/api/src/application/errors/ManifestArtifactResolutionError.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/application/ports/storedPlan.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/application/services/StoredExecutablePlanResolver.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/application/services/WorkflowEngineFactory.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/entrypoints/http/planRefHttpMapper.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/entrypoints/http/planRoutePlanRefParser.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/StoredExecutablePlanResolver.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/WorkflowEngineFactory.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/storedPlanExecutabilityValidator/capabilities.cases.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/storedPlanExecutabilityValidator/fetchAndAlignment.cases.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/application/services/storedPlanExecutabilityValidator/registry.cases.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/api/test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts` | `SYS-PLANSTORE-API-COMPOSITION` | `drift` |
| `apps/temporal-worker/src/runtime/runtimeTypes.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `apps/temporal-worker/src/runtime/temporalWorkerStores.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `docs/contracts/planner/PlanStoreRecords.v1.md` | `SYS-PLANSTORE-CONTRACTS` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.admission-repository.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executability-repository.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executable-blob-repository.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.schema-manager.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.tx.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStoreComposer.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.integration.helpers.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts` | `SYS-PLANSTORE-POSTGRES` | `drift` |
| `packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts` | `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `legacy` |
| `packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts` | `SYS-PLANSTORE-CONTRACTS` | `drift` |
| `packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts` | `SYS-PLANSTORE-CONTRACTS` | `drift` |
| `packages/@dvt/engine/src/ports/IPlanArtifactReader.ts` | `SYS-PLANSTORE-ENGINE-FETCH` | `drift` |
| `packages/@dvt/engine/src/security/planRefPolicy.ts` | `SYS-PLANSTORE-ENGINE-FETCH` | `drift` |
| `packages/@dvt/engine/src/security/planRefPolicyRules.ts` | `SYS-PLANSTORE-ENGINE-FETCH` | `drift` |
| `packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts` | `SYS-PLANSTORE-ENGINE-FETCH` | `drift` |
| `packages/@dvt/engine/test/security/planRefPolicy.test.ts` | `SYS-PLANSTORE-ENGINE-FETCH` | `drift` |
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
- [System Governance Document Unit Map](./system-governance-document-unit-map-20260501.md)
