---
title: DBT Project Round-Trip Current Contract
status: Accepted
owner: Web / API / DBT
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/dbt-project-roundtrip-product-plan-20260527.md
---

# DBT project round-trip

The DBT workspace bounded context owns project-file projection and working-tree
synchronization. Current rails are `ProjectDbtGraphFromFiles`,
`ProjectDbtRoundtripCapabilityStatus`, `SaveWorkspaceFileContent`,
`GetWorkspaceFileContent`, and `RunDbtAuthorCodeRunLiveProof`.

Product behavior lives in the DBT application ports and the web/API adapters.
Current capability and architecture facts are exported through
`tools/planning-db/state/canonical-state.json`. Planning DB structure, when
needed by its read models, is declared only in `tools/planning-db/schema.sql`.
The former `ExportDbtProject` rail is retired; file round-trip uses the current
workspace file rails above.
Validation is the DBT round-trip package and web/API tests plus
`scripts/planning-db-dbt-roundtrip-capability-status.test.cjs` and
`pnpm verify:prepush`.

```feature-mechanization
version: 1
featureId: E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
owner: dbt Project Analysis / Canvas Authoring
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md
componentGuides:
  - docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md
governingSources:
  - AGENTS.md
  - docs/adr/ADR-0060-dbt-project-authoring-authority.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts
  - packages/@dvt/contracts/test/**
  - apps/api/src/application/ports/dbtProjectAnalysis.ts
  - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
  - apps/api/src/infrastructure/dbt/**
  - apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts
  - apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts
  - apps/api/test/infrastructure/dbt/**
  - apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts
  - apps/web/src/app/services/dbtProject/**
  - apps/web/src/app/views/canvas/**
  - apps/web/cypress/e2e/dbt/**
  - docs/architecture/components/web/**
  - docs/evidence/**
  - docs/risk-register/quality/**
  - docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-*/**
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
commandQueryRails:
  - name: ProjectDbtGraphFromFiles
    type: query
    dddOwner: DbtProjectGraphProjection
domainObjects:
  - name: CanvasAuthoringAuthorityBinding
    type: value object
    owner: Canvas Authoring
  - name: DbtProjectAnalysis
    type: read model
    owner: dbt Project Analysis
  - name: DbtProjectGraphProjection
    type: projection
    owner: dbt Project Analysis
fowlerSignals:
  - Boundary drift
  - Hidden authority
  - Responsibility overload
  - Primitive obsession
architectureGuards:
  - pnpm --filter dvt-api test:arch
  - pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts
cypressFlows:
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
completionGate:
  - pnpm --filter @dvt/contracts test
  - pnpm --filter dvt-api test
  - pnpm --filter dvt-api typecheck
  - pnpm --filter dvt-api lint
  - pnpm --filter @dvt/web test:unit:run
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization:implementation -- --feature E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713
  - pnpm verify:prepush
redGreenCycles:
  - id: dbt-project-file-projection-current-rail
    redTest: pnpm --filter dvt-api exec vitest run test/application/projectDbtGraphFromFilesUseCase.test.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts
    expectedFailure: The protected current-state projection query is absent or bypasses the project analyzer port.
    patchSurfaces:
      - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
      - apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts
    greenTest: pnpm --filter dvt-api exec vitest run test/application/projectDbtGraphFromFilesUseCase.test.ts test/entrypoints/http/dbtProjectGraphRoutes.test.ts
symbols:
  - name: CanvasAuthoringAuthorityBindingSchema
    path: packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts
    dddOwner: CanvasAuthoringAuthorityBinding
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm --filter @dvt/contracts test -- CanvasAuthoringAuthorityBinding
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts]
  - name: DbtProjectGraphProjectionSchema
    path: packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts
    dddOwner: DbtProjectGraphProjection
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/contracts test -- DbtProjectGraphProjection
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [packages/@dvt/contracts/test/dbt-project-file-projection.contract.test.ts]
  - name: IDbtProjectAnalyzerPort
    path: apps/api/src/application/ports/dbtProjectAnalysis.ts
    dddOwner: DbtProjectAnalysis
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter dvt-api test:arch
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts]
  - name: ProjectDbtGraphFromFilesUseCase
    path: apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
    dddOwner: DbtProjectGraphProjection
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Responsibility overload]
    architectureGuard: pnpm --filter dvt-api test:arch
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts]
  - name: DbtCliProjectAnalyzer
    path: apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts
    dddOwner: DbtProjectAnalysis
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter dvt-api test:arch
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts]
  - name: registerDbtProjectGraphRoutes
    path: apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts
    dddOwner: ProjectDbtGraphFromFiles HTTP adapter
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter dvt-api test:arch
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [apps/api/test/entrypoints/http/dbtProjectGraphRoutes.test.ts]
  - name: projectDbtProjectGraphToCanonicalCanvas
    path: apps/web/src/app/views/canvas/dbtProjectFileProjection.ts
    dddOwner: DbtProjectGraphProjection
    cqRails: [ProjectDbtGraphFromFiles]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts
    cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    unitTests: [apps/web/src/app/views/canvas/dbtProjectFileProjection.test.ts]
```

The detailed delivery record is historical and remains at `archived_record`.
