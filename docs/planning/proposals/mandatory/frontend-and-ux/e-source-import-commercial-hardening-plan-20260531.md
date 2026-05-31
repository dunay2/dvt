---
title: E Source Import Commercial Hardening Plan
status: Accepted
date: 2026-05-31
owners:
  - Web
  - API
planning_type: mandatory-plan
---

# E Source Import Commercial Hardening Plan

## User Stories

| ID                            | Story                                                                                                                                                 | Acceptance                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-SOURCE-IMPORT-CATALOG-US`  | As an analytics engineer, I can discover warehouse connections and tables from workspace-governed catalog data instead of product hardcoded fixtures. | `GET /workspace/warehouse/connections` reads `.dvt/warehouse-connections.json`; missing catalog returns an empty list; unknown connection/table selections fail closed. |
| `E-SOURCE-IMPORT-ARTIFACT-US` | As an analytics engineer, importing selected warehouse tables creates durable dbt source YAML as well as canvas source nodes.                         | `POST /workspace/sources/import` persists deterministic `models/sources/*.yml` content and saves graph source nodes with server-authoritative table metadata.           |
| `E-SOURCE-IMPORT-QA-US`       | As a demanding reviewer, source import rejects fake client metadata, duplicate churn, missing catalog data, and draft conflicts.                      | Tests prove catalog-owned metadata wins, duplicate imports are no-op for nodes, and conflicts do not report hidden success.                                             |

## Think-First Analysis

Problem summary: PR #1390 merged backend rails for source import, but the
default catalog was an in-process hardcoded fixture. That made the API route
technically callable without giving the product a commercial source-import
capability.

Root cause: the previous slice optimized for replacing a throw-only adapter with
route coverage. It did not move catalog authority to workspace-owned product
data and did not persist a dbt source artifact that a user can inspect or use.

Constraints and invariants:

- `docs/architecture/command-query-rail-governance.md` requires externally
  observable behavior to stay on the existing `ListWarehouseConnections`,
  `ListWarehouseConnectionTables`, and `ImportWarehouseSources` rails.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires the
  hardening to name the boundary drift and hidden authority it removes.
- `docs/planning/roadmap/strategic-product-roadmap.md` requires Lane E to turn
  backend surfaces into an operator-visible product loop.
- ADR-0058 keeps warehouse source import behind protected runtime rails.
- `AGENTS.md` no-stub policy forbids replacing the hardcoded catalog with
  another fake success path.

Options considered:

- Keep the hardcoded catalog and improve copy. Rejected: this preserves demo
  authority and does not improve product value.
- Add a live database driver in this slice. Rejected: credentials, secrets
  lifecycle, and per-warehouse discovery contracts are not present in the
  repository and would create hidden debt if invented ad hoc.
- Use a workspace-governed catalog file and persist generated dbt source YAML.
  Selected: it creates a real pilot path without credentials debt, keeps source
  data under workspace/project ownership, and produces a durable artifact.

Selected option and rationale: replace the default hardcoded catalog with a
workspace-file-backed catalog at `.dvt/warehouse-connections.json`, then extend
`ImportWarehouseSources` so a successful import writes deterministic dbt source
YAML under `models/sources/*.yml` and mutates the authoritative graph draft.

Rejected alternatives: UI-only fixture data, route-only backend coverage, and
parallel source-import services outside the existing protected rails.

## Fowler Opportunity Matrix

| Scenario                                                         | Opportunity                                  | Pattern                             | DDD owner                                 | Rail                                                        | Allowed surfaces                    | Tests                         | Out of scope                            |
| ---------------------------------------------------------------- | -------------------------------------------- | ----------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------- | ----------------------------- | --------------------------------------- |
| Hardcoded `local-analytics` catalog is production default.       | Hidden authority, test-only confidence       | Repository / Gateway                | Warehouse source import                   | `ListWarehouseConnections`, `ListWarehouseConnectionTables` | API infrastructure and route group  | Route and architecture tests  | Catalog discovery from live credentials |
| Import result names YAML files but does not persist source YAML. | Boundary drift, incomplete aggregate outcome | Service Layer + Aggregate update    | Warehouse source import + workspace files | `ImportWarehouseSources`                                    | API service and workspace file port | API service and route tests   | Full dbt project compilation            |
| Client can attempt malicious metadata or duplicates.             | Primitive obsession, hidden authority        | Authoritative read model validation | Warehouse source import                   | `ImportWarehouseSources`                                    | API use case and route group        | Negative route/use-case tests | UI redesign                             |

## Pre-Implementation Brief

- Mode: Full.
- Scope: sanitize the merged source-import backend into a commercial minimum
  vertical using workspace-governed catalog data and durable dbt source YAML.
- Expected outcome: no production route group uses a hardcoded warehouse
  catalog; imports create graph nodes and workspace YAML artifacts.
- Risks and mitigations:
  - Invalid catalog JSON: validate with a schema and fail closed.
  - Missing catalog: return an empty connection list instead of fake data.
  - Duplicate import: keep node creation idempotent and merge YAML by source and
    table name.
  - Cross-resource persistence: write deterministic YAML through the existing
    workspace-file command port and cover the outcome in tests.
- Out of scope: secret storage, direct Snowflake/Postgres table introspection,
  credential testing, and Cypress flow additions.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature E-SOURCE-IMPORT-COMMERCIAL`
  - `pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api lint`
  - `pnpm governance:refresh`
  - `pnpm verify:prepush`

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-SOURCE-IMPORT-COMMERCIAL
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md
componentGuides:
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
userStories:
  - E-SOURCE-IMPORT-CATALOG-US
  - E-SOURCE-IMPORT-ARTIFACT-US
  - E-SOURCE-IMPORT-QA-US
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/roadmap/strategic-product-roadmap.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
allowedImplementationSurfaces:
  - pnpm-lock.yaml
  - apps/api/package.json
  - apps/api/src/application/ports/warehouseSourceImport.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/application/services/warehouseSourceYaml.ts
  - apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts
  - apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts
  - apps/api/src/infrastructure/warehouseSourceImport/**
  - apps/api/src/infrastructure/workspaceFiles/**
  - apps/api/test/application/services/warehouseSourceYaml.test.ts
  - apps/api/test/infrastructure/warehouseSourceImport/**
  - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
  - docs/planning/closeouts/20260531-e-source-import-commercial-hardening-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - packages/**
  - specs/contracts/**
  - apps/web/cypress/**
  - docs/archive/**
commandQueryRails:
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source import
  - name: ListWarehouseConnectionTables
    type: query
    dddOwner: Warehouse source import
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import
domainObjects:
  - name: WarehouseConnectionCatalog
    type: read model
    owner: Warehouse source import
  - name: WorkspaceFileContent
    type: aggregate
    owner: Workspace files
  - name: WorkspaceGraphAuthoringDraft
    type: aggregate
    owner: Workspace graph draft
fowlerSignals:
  - Hardcoded catalog created hidden authority
  - Route tests gave test-only confidence without product value
  - Import command named YAML files without writing durable artifacts
architectureGuards:
  - pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - backend commercial hardening slice only
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm --filter dvt-api test
  - pnpm --filter dvt-api typecheck
  - pnpm --filter dvt-api lint
  - pnpm verify:prepush
redGreenCycles:
  - id: workspace-governed-catalog
    redTest: pnpm --filter dvt-api test -- test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
    expectedFailure: Production source import still uses a hardcoded in-memory catalog and no workspace catalog adapter exists.
    patchSurfaces:
      - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
      - apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts
      - apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
      - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
    greenTest: pnpm --filter dvt-api test -- test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  - id: durable-dbt-source-yaml
    redTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    expectedFailure: ImportWarehouseSources does not persist dbt source YAML through the workspace file repository.
    patchSurfaces:
      - apps/api/src/application/services/warehouseSourceYaml.ts
      - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
      - apps/api/test/application/services/warehouseSourceYaml.test.ts
      - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    greenTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts
xApiSymbol: &api_symbol
  dddOwner: Warehouse source import
  cqRails: [ListWarehouseConnections, ListWarehouseConnectionTables, ImportWarehouseSources]
  fowlerSignals: [Hardcoded catalog created hidden authority]
  architectureGuard: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  cypressCoverage: N/A - backend hardening slice only
  unitTests:
    - apps/api/test/application/services/warehouseSourceYaml.test.ts
    - apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
    - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
symbols:
  - <<: *api_symbol
    name: SourceYamlColumn
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlTable
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlFreshness
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlSource
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlDocument
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: WarehouseColumnCatalogSchema
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: WarehouseTableCatalogSchema
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: WarehouseConnectionCatalogSchema
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: WorkspaceWarehouseConnectionCatalogSchema
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: WorkspaceWarehouseConnectionCatalog
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: resolveWorkspaceWarehouseCatalog
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: buildCatalogTableKey
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: normalizeCatalogEntry
    path: apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - <<: *api_symbol
    name: resolveWorkspaceFilesRoot
    path: apps/api/src/infrastructure/workspaceFiles/resolveWorkspaceFilesRoot.ts
  - <<: *api_symbol
    name: WarehouseSourceYamlUpdate
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: BuildWarehouseSourceYamlUpdatesInput
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: buildWarehouseSourceYamlUpdates
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: readExistingSourceDocument
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: groupTablesForYaml
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: upsertSourceTable
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: serializeSourceDocument
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: buildColumns
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: readExistingColumns
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: isRecord
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: TestWarehouseConnectionCatalog
    path: apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - <<: *api_symbol
    name: MemoryWorkspaceFileRepository
    path: apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
  - <<: *api_symbol
    name: repositoryWithCatalog
    path: apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
```
