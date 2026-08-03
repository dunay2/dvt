---
title: E DB Connection Port Gate Plan
status: Accepted
date: 2026-05-31
last_reviewed: 2026-08-03
owners:
  - Web
planning_type: mandatory-plan
---

# E DB Connection Port Gate Plan

## Think-First Analysis

Problem summary: the web API workspace port adapts warehouse connection and
source-import calls to protected API endpoints. The original implementation
also turned `sourceImportAvailable` into route policy from a transport-level
constant, allowing route-level state to claim source import was open when
runtime plugin capabilities disabled the dbt source-import contribution. The
current hard cut removes that exhausted transport authority.

Root cause: transport reachability and product availability were collapsed into
one boolean. Protected endpoint failures already fail closed on the existing
rails; the Canvas composition root only needs to decide whether an authorized
runtime source-import contribution is available to the user.

Constraints and invariants:

- `docs/architecture/command-query-rail-governance.md` keeps the behavior on the
  existing `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, and
  `ImportWarehouseSources` rails.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires the
  slice to remove hidden authority without broadening ownership.
- `docs/architecture/components/web/plugin-contributions-developer-guide.md`
  keeps source-import options declared by the plugin and enabled by the shell.
- `docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md`
  already implements the backend adapter and plugin-declared source-import
  options; this slice must not reopen backend behavior.

Options considered:

- Keep `apiWorkspacePortCapabilities.sourceImportAvailable = true` as the sole
  route gate. Rejected: that preserves hidden UI authority when the runtime
  plugin contribution is unavailable.
- Move plugin checks into `workspacePorts.ts`. Rejected: workspace transport
  ports should not depend on plugin presentation registry state.
- Use authorized runtime source-import contributions as the Canvas route gate.
  Selected and subsequently hard-cut: it keeps product availability in the
  plugin composition root while protected transport remains behind the existing
  command/query rails, without a parallel capability boolean.

## Fowler Opportunity Matrix

| Scenario                                                                    | Opportunity      | Pattern                       | DDD owner          | Rail                                                             | Allowed surfaces              | Tests                      | Out of scope       |
| --------------------------------------------------------------------------- | ---------------- | ----------------------------- | ------------------ | ---------------------------------------------------------------- | ----------------------------- | -------------------------- | ------------------ |
| Canvas policy claims source import is open from a transport constant alone. | Hidden authority | Composition Root / Policy DTO | Canvas route shell | `ImportWarehouseSources`, `ListWarehouseConnections`             | Canvas controller environment | Controller route unit test | Backend route work |
| Runtime plugin disables dbt but empty/route policy still sees import open.  | Boundary drift   | Plugin Contribution Gate      | dbt plugin shell   | `ListWarehouseConnectionSourceObjects`, `ImportWarehouseSources` | Runtime capability projection | Negative route policy test | Wizard redesign    |

## Component Command/Query Matrix

| Component                                     | CQ role                      | Command/query entry                                                                                                                                                                    | Command/query output                                                                                                        | DDD object or read model                                                                                             | Adapter surface                                                                  | Authorization and scope                                                                                                                                   | Proof                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SYS-WEB-CANVAS-SOURCE-IMPORT-POLICY`         | capability policy consumer   | Resolves authorized `SourceImportContribution` entries from runtime capabilities for `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, and `ImportWarehouseSources`. | Emits Canvas route policy `canOpenSourceImport`; no transport call.                                                         | `RuntimeCapabilities` read model and `SourceImportContribution` plugin declaration.                                  | `useCanvasControllerEnvironment`, `useCanvasController`, `CanvasShell`.          | Requires route mutation posture and an authorized contribution; protected rails retain backend authorization and fail-closed transport behavior.          | `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx`                                                                                                                                                                                                          |
| `SYS-WEB-WORKSPACE-SOURCE-IMPORT-PORT-FACADE` | web command/query adapter    | `IWarehouseSourceImportPort.listWarehouseConnections`, `listSourceObjects`, and `importSources`.                                                                                       | Calls scoped protected runtime endpoints for the three accepted rails.                                                      | `WarehouseConnectionCatalog`, `SourceObjectCatalogResponse`, `WorkspaceGraphAuthoringDraft`.                         | `workspacePorts.ts`, `workspacePorts.api.ts`, `ports/workspace.ts`.              | Adds tenant/project/environment query scope from workspace context; backend enforces `workspace:source-import:view` and `workspace:source-import:import`. | `pnpm --filter @dvt/web test -- src/app/services/workspace/workspacePorts.api.test.ts src/app/services/workspace/workspacePorts.imports.test.ts`                                                                                                                                                        |
| `SYS-WEB-SOURCE-IMPORT-WIZARD`                | UI command/query consumer    | Invokes `IWarehouseSourceImportPort` queries to list connections/source objects and the command to import selected source objects.                                                     | Renders choices and submits `ImportWarehouseSources` input; receives command receipt with imported node IDs and YAML files. | `WarehouseConnection`, `SourceObject`, `ImportSourcesResult`.                                                        | `SourceImportWizard` and `sourceImportWizard/*`.                                 | May only open when Canvas policy allows source import.                                                                                                    | `pnpm --filter @dvt/web test -- src/app/components/SourceImportWizard.test.tsx src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts`                                                                                                                                                   |
| `SYS-WEB-PLUGIN-SOURCE-IMPORT-CONTRIBUTIONS`  | plugin declaration provider  | Declares source-import options consumed by the Canvas gate and wizard.                                                                                                                 | Emits available source-import option declarations; no API authority.                                                        | `SourceImportContribution`.                                                                                          | `plugins/dbt/dbtContributions.ts`, plugin registry.                              | Runtime plugin availability only; cannot bypass backend authorization.                                                                                    | `pnpm --filter @dvt/web test -- src/app/plugins/registry.test.ts src/app/plugins/dbt/dbtContributions.connectionRules.test.ts`                                                                                                                                                                          |
| `SYS-API-WAREHOUSE-SOURCE-IMPORT-RAILS`       | protected runtime rail owner | `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, `ImportWarehouseSources`.                                                                                          | Returns connection/source-object read models or an import receipt after graph/YAML persistence.                             | `WarehouseConnectionCatalog`, `SourceObjectCatalogResponse`, `WorkspaceGraphAuthoringDraft`, `WorkspaceFileContent`. | `warehouseSourceImportRoutes`, use cases, catalog adapter, source YAML services. | `workspace:source-import:view` for reads; `workspace:source-import:import` for import; tenant/project/environment scope from protected runtime request.   | `pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts` |

## Pre-Implementation Brief

- Mode: Slim.
- Scope: derive Canvas `canOpenSourceImport` from authorized runtime
  source-import plugin contributions and route mutation posture.
- Expected outcome: when runtime capabilities disable the dbt plugin, Canvas
  route policy exposes `canOpenSourceImport=false` even though the API adapter
  remains available.
- Risks and mitigations:
  - Risk: coupling workspace transport services to plugin registry. Mitigation:
    keep contribution resolution in `useCanvasControllerEnvironment`, not in
    workspace port adapters.
  - Risk: reopening source import API behavior. Mitigation: no API files are in
    the allowed implementation surfaces.
- Out of scope: backend catalog changes, wizard step changes, new source types,
  credential handling, Cypress coverage, and live database introspection.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature E-DB-CONNECTION-PORT-1`
  - `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web lint`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-DB-CONNECTION-PORT-1
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-db-connection-port-gate-plan-20260531.md
componentGuides:
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
  - docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md
userStories:
  - E-DB-CONNECTION-PORT-1
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
  - apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx
  - apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts
  - apps/web/src/app/views/canvas/useCanvasController.test.types.ts
  - docs/planning/proposals/mandatory/frontend-and-ux/e-db-connection-port-gate-plan-20260531.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/**
  - specs/contracts/**
  - apps/web/cypress/**
  - docs/archive/**
commandQueryRails:
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source import
  - name: ListWarehouseConnectionSourceObjects
    type: query
    dddOwner: Warehouse source import
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import
domainObjects:
  - name: RuntimeCapabilities
    type: read model
    owner: Canvas route shell
  - name: SourceImportContribution
    type: plugin contribution
    owner: dbt plugin shell
fowlerSignals:
  - Source import route policy used transport capability as product capability
  - Runtime plugin availability was checked downstream in CanvasShell only
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - controller policy unit slice only
completionGate:
  - pnpm docs:sync
  - pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm verify:prepush
redGreenCycles:
  - id: runtime-source-import-capability-gate
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx
    expectedFailure: Canvas route policy reports canOpenSourceImport=true when runtime capabilities disable the dbt source-import contribution.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
      - apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx
      - apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts
      - apps/web/src/app/views/canvas/useCanvasController.test.types.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx
symbols:
  - name: useCanvasControllerEnvironment
    path: apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
    dddOwner: Canvas route shell
    cqRails: [ImportWarehouseSources, ListWarehouseConnections, ListWarehouseConnectionSourceObjects]
    fowlerSignals: [Source import route policy used transport capability as product capability]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.permissions.test.tsx
    cypressCoverage: N/A - controller policy unit slice only
    unitTests:
      - apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx
```
