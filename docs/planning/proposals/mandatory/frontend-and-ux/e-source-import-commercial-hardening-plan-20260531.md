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
| `E-SOURCE-IMPORT-PLUGIN-US`   | As a plugin author, source import options are declared by the active plugin instead of hardcoded in the app shell.                                    | The dbt plugin declares source YAML import options; the shell enables them only when the plugin is available at runtime; the wizard renders only declared options.      |
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

| Scenario                                                         | Opportunity                                  | Pattern                                | DDD owner                                 | Rail                                                        | Allowed surfaces                    | Tests                         | Out of scope                            |
| ---------------------------------------------------------------- | -------------------------------------------- | -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------- | ----------------------------- | --------------------------------------- |
| Hardcoded `local-analytics` catalog is production default.       | Hidden authority, test-only confidence       | Repository / Gateway                   | Warehouse source import                   | `ListWarehouseConnections`, `ListWarehouseConnectionTables` | API infrastructure and route group  | Route and architecture tests  | Catalog discovery from live credentials |
| Import result names YAML files but does not persist source YAML. | Boundary drift, incomplete aggregate outcome | Service Layer + Aggregate update       | Warehouse source import + workspace files | `ImportWarehouseSources`                                    | API service and workspace file port | API service and route tests   | Full dbt project compilation            |
| Client can attempt malicious metadata or duplicates.             | Primitive obsession, hidden authority        | Authoritative read model validation    | Warehouse source import                   | `ImportWarehouseSources`                                    | API use case and route group        | Negative route/use-case tests | UI redesign                             |
| Wizard hardcodes dbt artifact options in app UI.                 | Shotgun surgery, hidden plugin authority     | Plugin / Registry + Presentation Model | dbt plugin + Canvas shell                 | `ImportWarehouseSources`                                    | Web plugin registry and wizard      | Registry, shell, wizard tests | Arbitrary plugin option DTOs            |
| Graph explorer hardcodes active-row visual tokens.               | Divergent presentation authority             | Token component                        | Canvas graph visual system                | `ImportWarehouseSources`                                    | Graph token component + explorer    | Architecture token test       | Broader visual redesign                 |

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
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
userStories:
  - E-SOURCE-IMPORT-CATALOG-US
  - E-SOURCE-IMPORT-ARTIFACT-US
  - E-SOURCE-IMPORT-PLUGIN-US
  - E-SOURCE-IMPORT-QA-US
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
  - docs/planning/roadmap/strategic-product-roadmap.md
  - docs/adr/ADR-0058-warehouse-source-import-rails.md
allowedImplementationSurfaces:
  - pnpm-lock.yaml
  - apps/api/package.json
  - apps/api/src/application/ports/warehouseSourceImport.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/application/services/warehouseSourceYaml.ts
  - apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts
  - apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts
  - apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts
  - apps/api/src/infrastructure/warehouseSourceImport/**
  - apps/api/src/infrastructure/workspaceFiles/**
  - apps/api/test/application/services/warehouseSourceYaml.test.ts
  - apps/api/test/infrastructure/warehouseSourceImport/**
  - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
  - apps/web/src/app/plugins/registry.ts
  - apps/web/src/app/plugins/PluginRegistry.ts
  - apps/web/src/app/plugins/dbt/dbtContributions.ts
  - apps/web/src/app/plugins/registry.test.ts
  - apps/web/src/app/plugins/graph/graphVisualTokens.ts
  - apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - apps/web/src/app/components/DbtExplorer.tsx
  - apps/web/src/app/components/SourceImportWizard.tsx
  - apps/web/src/app/components/SourceImportWizard.test.tsx
  - apps/web/src/app/components/sourceImportWizard/**
  - apps/web/src/app/views/canvas/CanvasShell.tsx
  - apps/web/src/app/views/canvas/CanvasShell.test.tsx
  - apps/web/src/app/views/canvas/canvasGraphHandlerContracts.ts
  - apps/web/src/app/views/canvas/canvasShell.types.ts
  - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts
  - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts
  - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - apps/web/src/app/views/canvas/useCanvasNodeAuthoringHandlers.ts
  - apps/web/src/app/views/canvas/useCanvasNodeDropHandlers.ts
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
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
  - Plugin-owned source artifact options were hardcoded in app UI
  - Graph consumer-owned visual tokens drifted from graph token component
architectureGuards:
  - pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/SourceImportWizard.test.tsx src/app/views/canvas/CanvasShell.test.tsx
  - pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts src/app/views/canvas/useCanvasNodeAuthoringHandlers.architecture.test.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - backend commercial hardening slice only
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm --filter dvt-api test
  - pnpm --filter @dvt/web test
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter dvt-api typecheck
  - pnpm --filter dvt-api lint
  - pnpm --filter @dvt/web lint
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
  - id: preserve-existing-dbt-source-metadata
    redTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts
    expectedFailure: Adding a table to an existing dbt source YAML strips existing source, table, column, test, config, and meta metadata.
    patchSurfaces:
      - apps/api/src/application/services/warehouseSourceYaml.ts
      - apps/api/test/application/services/warehouseSourceYaml.test.ts
    greenTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts
  - id: plugin-declared-source-import-options
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/SourceImportWizard.test.tsx src/app/views/canvas/CanvasShell.test.tsx
    expectedFailure: Source import wizard hardcodes dbt artifact options and remains visible even when the dbt plugin is unavailable at runtime.
    patchSurfaces:
      - apps/web/src/app/plugins/registry.ts
      - apps/web/src/app/plugins/PluginRegistry.ts
      - apps/web/src/app/plugins/dbt/dbtContributions.ts
      - apps/web/src/app/components/SourceImportWizard.tsx
      - apps/web/src/app/components/sourceImportWizard/**
      - apps/web/src/app/views/canvas/CanvasShell.tsx
      - apps/web/src/app/views/canvas/canvasShell.types.ts
      - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
      - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts
      - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
      - docs/architecture/components/web/plugin-contributions-developer-guide.md
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/SourceImportWizard.test.tsx src/app/views/canvas/CanvasShell.test.tsx
  - id: plugin-source-import-runtime-defaults
    redTest: pnpm --filter @dvt/web test -- src/app/components/SourceImportWizard.test.tsx
    expectedFailure: Source import option defaults remain at the initial false state when plugin runtime declarations arrive after the wizard has mounted.
    patchSurfaces:
      - apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts
      - apps/web/src/app/views/canvas/CanvasShell.tsx
      - apps/web/src/app/components/SourceImportWizard.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/components/SourceImportWizard.test.tsx
  - id: align-plugin-freshness-declaration-with-yaml
    redTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts
    expectedFailure: dbt plugin copy declares warn_after and error_after freshness thresholds while generated YAML emits only warn_after.
    patchSurfaces:
      - apps/api/src/application/services/warehouseSourceYaml.ts
      - apps/api/test/application/services/warehouseSourceYaml.test.ts
    greenTest: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts
  - id: invalid-existing-source-yaml-error-boundary
    redTest: pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    expectedFailure: Malformed existing workspace source YAML is reported as a generic invalid request body instead of a workspace artifact error.
    patchSurfaces:
      - apps/api/src/application/ports/warehouseSourceImport.ts
      - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
      - apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts
      - apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
      - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    greenTest: pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - id: canvas-node-authoring-handler-ownership
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts
    expectedFailure: The node authoring handler composer still owns schema-attachment side effects and toasts instead of delegating them to the node drop/attachment handler.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasGraphHandlerContracts.ts
      - apps/web/src/app/views/canvas/useCanvasNodeAuthoringHandlers.ts
      - apps/web/src/app/views/canvas/useCanvasNodeDropHandlers.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts
  - id: graph-visual-token-ownership
    redTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    expectedFailure: DbtExplorer owns active-row slate and blue classes instead of consuming the graph token component.
    patchSurfaces:
      - apps/web/src/app/plugins/graph/graphVisualTokens.ts
      - apps/web/src/app/components/DbtExplorer.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
xApiSymbol: &api_symbol
  dddOwner: Warehouse source import
  cqRails: [ListWarehouseConnections, ListWarehouseConnectionTables, ImportWarehouseSources]
  fowlerSignals: [Hardcoded catalog created hidden authority, Durable artifact policy]
  architectureGuard: pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts
  cypressCoverage: N/A - backend hardening slice only
  unitTests:
    - apps/api/test/application/services/warehouseSourceYaml.test.ts
    - apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
    - apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    - apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts
xWebSymbol: &web_symbol
  dddOwner: dbt plugin + Canvas shell
  cqRails: [ImportWarehouseSources]
  fowlerSignals: [Plugin-owned source artifact options were hardcoded in app UI, Graph consumer-owned visual tokens drifted from graph token component]
  architectureGuard: pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/SourceImportWizard.test.tsx src/app/views/canvas/CanvasShell.test.tsx src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts src/app/views/canvas/useCanvasNodeAuthoringHandlers.architecture.test.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
  cypressCoverage: N/A - registry and shell unit coverage only
  unitTests:
    - apps/web/src/app/plugins/registry.test.ts
    - apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
    - apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts
    - apps/web/src/app/components/SourceImportWizard.test.tsx
    - apps/web/src/app/views/canvas/CanvasShell.test.tsx
symbols:
  - <<: *api_symbol
    name: SourceYamlMetadata
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlColumn
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: SourceYamlTable
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: GeneratedSourceYamlFreshness
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
    name: WarehouseSourceYamlArtifactDescriptor
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: InvalidWarehouseSourceYamlError
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
    name: WarehouseSourceYamlBinding
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: BuildWarehouseSourceYamlBindingsInput
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: InvalidWarehouseSourceImportRequestError
    path: apps/api/src/application/ports/warehouseSourceImport.ts
  - <<: *api_symbol
    name: HTTP_ERROR_REASON
    path: apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts
  - <<: *api_symbol
    name: buildWarehouseSourceYamlUpdates
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: buildWarehouseSourceYamlBindings
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: readExistingSourceDocument
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: buildWarehouseSourceYamlPath
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: groupTablesForYaml
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: buildSourceTableDatabaseIndex
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: findExistingSourceNameForTable
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: tableIdentity
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: sourceTableIdentity
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
    name: mergeColumns
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: mergeYamlArrays
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: readExistingColumns
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: readYamlMetadata
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: appendYamlMetadata
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: appendYamlEntry
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: isGeneratedFreshness
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: isRecord
    path: apps/api/src/application/services/warehouseSourceYaml.ts
  - <<: *api_symbol
    name: toSourceTableKey
    path: apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - <<: *api_symbol
    name: TestWarehouseConnectionCatalog
    path: apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
  - <<: *api_symbol
    name: MemoryWorkspaceFileRepository
    path: apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
  - <<: *api_symbol
    name: repositoryWithCatalog
    path: apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts
  - <<: *web_symbol
    name: SourceImportOptionId
    path: apps/web/src/app/plugins/registry.ts
  - <<: *web_symbol
    name: SourceImportOptionContribution
    path: apps/web/src/app/plugins/registry.ts
  - <<: *web_symbol
    name: SourceImportContribution
    path: apps/web/src/app/plugins/registry.ts
  - <<: *web_symbol
    name: getSourceImportContributions
    path: apps/web/src/app/plugins/registry.ts
  - <<: *web_symbol
    name: getSourceImportOptions
    path: apps/web/src/app/plugins/registry.ts
  - <<: *web_symbol
    name: dbtContributions
    path: apps/web/src/app/plugins/dbt/dbtContributions.ts
  - <<: *web_symbol
    name: graphVisualClasses
    path: apps/web/src/app/plugins/graph/graphVisualTokens.ts
  - <<: *web_symbol
    name: DbtExplorer
    path: apps/web/src/app/components/DbtExplorer.tsx
  - <<: *web_symbol
    name: SourceImportWizard
    path: apps/web/src/app/components/SourceImportWizard.tsx
  - <<: *web_symbol
    name: OptionsStep
    path: apps/web/src/app/components/sourceImportWizard/OptionsStep.tsx
  - <<: *web_symbol
    name: ReviewStep
    path: apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx
  - <<: *web_symbol
    name: WizardStepContent
    path: apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx
  - <<: *web_symbol
    name: buildSourceImportOptionValues
    path: apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts
  - <<: *web_symbol
    name: applySourceImportOptionDefaults
    path: apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts
  - <<: *web_symbol
    name: useSourceImportWizard
    path: apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts
  - <<: *web_symbol
    name: CanvasShell
    path: apps/web/src/app/views/canvas/CanvasShell.tsx
  - <<: *web_symbol
    name: CanvasShellPanels
    path: apps/web/src/app/views/canvas/canvasShell.types.ts
  - <<: *web_symbol
    name: CanvasShellPanelsBuilderArgs
    path: apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - <<: *web_symbol
    name: CanvasNodeDropContracts
    path: apps/web/src/app/views/canvas/canvasGraphHandlerContracts.ts
  - <<: *web_symbol
    name: buildCanvasShellPanels
    path: apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts
  - <<: *web_symbol
    name: buildCanvasShellProps
    path: apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - <<: *web_symbol
    name: useCanvasNodeAuthoringHandlers
    path: apps/web/src/app/views/canvas/useCanvasNodeAuthoringHandlers.ts
  - <<: *web_symbol
    name: useCanvasNodeDropHandlers
    path: apps/web/src/app/views/canvas/useCanvasNodeDropHandlers.ts
```
