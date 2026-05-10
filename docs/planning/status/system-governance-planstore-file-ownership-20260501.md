---
title: System Governance Plan-Store File Ownership
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance Plan-Store File Ownership

## Purpose

This document is the file-level ownership report for `SYS-PLANSTORE`. It records
which tracked files have been removed from broad root buckets and governed by
specific plan-store units.

The mechanical source is
[system-governance-unit-index.units.yaml](./system-governance-unit-index.units.yaml).
The global exhaustive projections are
[System Governance File Index](./system-governance-file-index-20260501.md) and
[System Governance Component Index](./system-governance-component-index-20260501.md).

## Totals

- Repository tracked files: 4044
- Files now governed by `SYS-PLANSTORE-*` units: 110
- Ungoverned files: 0, enforced by `pnpm docs:governance:unit-coverage`

## Unit Counts

| Unit                                 | Files | Status   | Where governed                                           |
| ------------------------------------ | ----: | -------- | -------------------------------------------------------- |
| `SYS-PLANSTORE-CONTRACTS`            |     3 | `drift`  | contracts, artifacts ports                               |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      |    24 | `review` | `packages/@dvt/artifacts`                                |
| `SYS-PLANSTORE-POSTGRES`             |    16 | `review` | `packages/@dvt/adapter-postgres`                         |
| `SYS-PLANSTORE-API-COMPOSITION`      |    19 | `review` | `apps/api`                                               |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` |    11 | `review` | `apps/temporal-worker`, `packages/@dvt/adapter-temporal` |
| `SYS-PLANSTORE-ENGINE-FETCH`         |     5 | `review` | `packages/@dvt/engine`                                   |
| `SYS-PLANSTORE-DOCS-RISK`            |    32 | `review` | docs, ADRs, evidence, risk, reviews                      |

## File Ownership

| Unit                                 | File                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/application/errors/ManifestArtifactResolutionError.ts`                                            |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/application/services/StoredExecutablePlanResolver.ts`                                             |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts`                                         |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/application/services/WorkflowEngineFactory.ts`                                                    |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/entrypoints/http/planRefHttpMapper.ts`                                                            |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/entrypoints/http/planRoutePlanRefParser.ts`                                                       |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts`                                               |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts`                             |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts`                            |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/StoredExecutablePlanResolver.test.ts`                                       |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts`                                   |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/WorkflowEngineFactory.test.ts`                                              |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/storedPlanExecutabilityValidator/capabilities.cases.ts`                     |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/storedPlanExecutabilityValidator/fetchAndAlignment.cases.ts`                |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts`                                |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/application/services/storedPlanExecutabilityValidator/registry.cases.ts`                         |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts`                                              |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts`                                         |
| `SYS-PLANSTORE-API-COMPOSITION`      | `apps/api/test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts`                       |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/package.json`                                                                          |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/adapters/FileSystemCompiledCodeStorage.ts`                            |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/adapters/InMemoryCompiledCodeStorage.ts`                              |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/adapters/MinioCompiledCodeStorage.ts`                                 |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/adapters/NoopCompiledCodeStorage.ts`                                  |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/adapters/S3CompiledCodeStorage.ts`                                    |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts`                                            |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/compiledCode/sha256.ts`                                                            |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/index.ts`                                                                          |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts`                                                     |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/ports/IDbtProjectBundleReader.ts`                                                  |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/ports/IRunExecutionContextReader.ts`                                               |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts`                                                 |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/ArtifactBackedDbtProjectBundleReader.ts`                                   |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/ArtifactBackedRunExecutionContextReader.ts`                                |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/ArtifactReadError.ts`                                                      |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/assertDbtProjectBundleBinding.ts`                                          |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/readArtifactBytes.ts`                                                      |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts`                                              |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/test/artifactSurface.test.ts`                                                          |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/test/runExecutionContextReaders.test.ts`                                               |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/test/validateArtifactIntegrity.test.ts`                                                |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/tsconfig.json`                                                                         |
| `SYS-PLANSTORE-ARTIFACTS-PORTS`      | `packages/@dvt/artifacts/vitest.config.ts`                                                                      |
| `SYS-PLANSTORE-CONTRACTS`            | `docs/contracts/planner/plan-store-records-v1.md`                                                               |
| `SYS-PLANSTORE-CONTRACTS`            | `packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts`                                                         |
| `SYS-PLANSTORE-CONTRACTS`            | `packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts`                                                         |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md`                                           |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/adr/adr-0052-planref-continuation-safety.md`                                                              |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md`                        |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary-user-stories.md`      |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md`                   |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ED-20260402-s08-contract-layer-hardening.md`                                                     |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ED-20260403-s08-4-ci-regression-fix.md`                                                          |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ED-20260403-s08-4-postgres-three-part-model-arc2.md`                                             |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ED-20260403-s08-5-b-run-execution-context-boundary.md`                                           |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ed-20260427-temporal-planref-config-hardening.md`                                                |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ed-20260427-temporal-planref-qa1-readiness.md`                                                   |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/evidence/ed-20260430-ar-d2-temporal-planref-capacity-sla.md`                                              |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/guides/postgres-plan-store-technical-manual-20260403.md`                                                  |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/guides/postgres-plan-store-user-manual-20260403.md`                                                       |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260402-s08-contract-layer-hardening-closeout.md`                                     |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260403-s08-3-artifacts-plan-store-ports-closeout.md`                                 |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260406-s08-4c-fail-closed-admission-coverage-closeout.md`                            |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260406-s08-5c-plugin-compatibility-fingerprint-closeout.md`                          |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260427-temporal-planref-spec-config-hardening-closeout.md`                           |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/closeouts/20260502-s08-temporal-legacy-removal-closeout.md`                                      |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md` |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md`       |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/reviews/20260402-s08-plan-record-plan-store-gap-review.md`                                       |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/reviews/architecture-and-governance/20260403-postgres-plan-store-srp-remediation-target.md`      |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/reviews/architecture-and-governance/20260403-s08-postgres-plan-store-hard-qa-review.md`          |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/planning/status/system-governance-planstore-file-ownership-20260501.md`                                   |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260402-S08-PLAN-STORE-CONTRACT-DRIFT.yaml`                                      |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260403-S08-4-CI-REGRESSION-FIX.yaml`                                            |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260403-S08-4-POSTGRES-THREE-PART-MODEL.yaml`                                    |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260405-PLAN-STORE-CANONICAL-SHAPE-DRIFT.yaml`                                   |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260408-ADAPTER-POSTGRES-PLANSTORE-TEST-DRIFT.yaml`                              |
| `SYS-PLANSTORE-DOCS-RISK`            | `docs/risk-register/quality/R-20260427-TEMPORAL-PLANREF-CONFIG-HARDENING.yaml`                                  |
| `SYS-PLANSTORE-ENGINE-FETCH`         | `packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts`                                                     |
| `SYS-PLANSTORE-ENGINE-FETCH`         | `packages/@dvt/engine/src/security/planRefPolicy.ts`                                                            |
| `SYS-PLANSTORE-ENGINE-FETCH`         | `packages/@dvt/engine/src/security/planRefPolicyRules.ts`                                                       |
| `SYS-PLANSTORE-ENGINE-FETCH`         | `packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts`                                                 |
| `SYS-PLANSTORE-ENGINE-FETCH`         | `packages/@dvt/engine/test/security/planRefPolicy.test.ts`                                                      |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.admission-repository.ts`                                  |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executability-repository.ts`                              |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executable-blob-repository.ts`                            |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts`                                               |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts`                                |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.schema-manager.ts`                                        |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts`                                                   |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts`                                                       |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStore.tx.ts`                                                    |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/src/PostgresPlanStoreComposer.ts`                                               |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.integration.helpers.ts`                                  |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts`                                 |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts`                           |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts`                        |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts`                      |
| `SYS-PLANSTORE-POSTGRES`             | `packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts`                                             |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `apps/temporal-worker/src/runtime/runtimeTypes.ts`                                                              |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts`                                               |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts`                                            |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `apps/temporal-worker/src/runtime/temporalWorkerStores.ts`                                                      |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts`                        |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts`                                   |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts`                                        |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts`                                       |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts`                                        |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts`                                  |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts`                         |
