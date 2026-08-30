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
Current capability and architecture facts live in Planning DB and are read
through governed queries. Planning DB structure, when
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
  - pnpm docs:feature-mechanization:implementation
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

```feature-mechanization
version: 1
featureId: E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
owner: Architecture / Planning DB
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md
componentGuides:
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
userStories:
  - Operators query current DBT round-trip rail posture without interpreting historical delivery records.
  - Reviewers receive a failing check when canonical rail posture or reviewed Git ancestry drifts.
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/adr/ADR-0060-dbt-project-authoring-authority.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - .github/workflows/pr-quality-gate.yml
  - docs/.manifest.json
  - docs/**/index.md
  - docs/adr/ADR-0060-dbt-project-authoring-authority.md
  - docs/generated-docs-policy.json
  - docs/planning/closeouts/20260830-2745-export-dbt-project-retirement-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md
  - package.json
  - scripts/generate-dbt-project-roundtrip-capability-status.cjs
  - scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
  - scripts/governance-refresh.cjs
  - scripts/governance-refresh.test.cjs
  - scripts/planning-db-dbt-roundtrip-capability-maturity.test.cjs
  - scripts/planning-db-dbt-roundtrip-capability-mechanization.test.cjs
  - scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
  - scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs
  - tools/planning-db/schema.sql
  - tools/planning-db/state/dbt-project-roundtrip-capabilities.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - docs/planning/archive/**
commandQueryRails:
  - name: ProjectDbtRoundtripCapabilityStatus
    type: query
    dddOwner: DbtProjectRoundtripCapabilityStatus
domainObjects:
  - name: DbtProjectRoundtripCapabilityStatus
    type: read-model
    owner: Architecture / Planning DB
  - name: DbtProjectRoundtripPhaseRailEvidence
    type: entity
    owner: Architecture / Planning DB
fowlerSignals:
  - Hidden authority
  - Duplicated truth
  - Separated interface
  - Fail-closed evidence
architectureGuards:
  - node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs
  - node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
  - node --test scripts/planning-db-dbt-roundtrip-capability-mechanization.test.cjs
cypressFlows:
  - not_applicable:governance_read_model
completionGate:
  - pnpm planning:db:query dbt-roundtrip-capabilities --limit 20
  - pnpm docs:dbt-roundtrip-capabilities:check
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: dbt-roundtrip-retired-export-removal
    redTest: node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
    expectedFailure: The current catalog and renderer still require the retired phase-6 ExportDbtProject gap.
    patchSurfaces:
      - docs/adr/ADR-0060-dbt-project-authoring-authority.md
      - tools/planning-db/state/dbt-project-roundtrip-capabilities.json
      - scripts/generate-dbt-project-roundtrip-capability-status.cjs
      - scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
      - scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
    greenTest: node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
  - id: dbt-roundtrip-current-capability-projection
    redTest: node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
    expectedFailure: The current schema lacks normalized phase evidence or the governed capability projection.
    patchSurfaces:
      - tools/planning-db/schema.sql
      - scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs
    greenTest: node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs
  - id: dbt-roundtrip-current-evidence-render
    redTest: node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    expectedFailure: The generator does not validate current rail posture and reviewed Git ancestry deterministically.
    patchSurfaces:
      - scripts/generate-dbt-project-roundtrip-capability-status.cjs
      - scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    greenTest: node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
symbols:
  - name: createDbtProjectRoundtripCapabilityStatusReadModel
    path: scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatus
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Query Model, Single Source of Truth]
    architectureGuard: scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs]
  - name: readDbtProjectRoundtripCapabilityStatusRows
    path: scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatus
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Query Model, Single Source of Truth]
    architectureGuard: scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs]
  - name: defaultOutputPath
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: governedCapabilityKeys
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Fail Closed, Published Language]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: normalizeDbtRoundtripCapabilityRow
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: parseArgs
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: renderDbtRoundtripCapabilityStatus
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: runDbtRoundtripCapabilityStatusGenerator
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: validateDbtRoundtripCapabilityRows
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Fail Closed, Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
  - name: verifyGitCommitAncestry
    path: scripts/generate-dbt-project-roundtrip-capability-status.cjs
    dddOwner: DbtProjectRoundtripCapabilityStatusRenderer
    cqRails: [ProjectDbtRoundtripCapabilityStatus]
    fowlerSignals: [Fail Closed, Separated Interface]
    architectureGuard: scripts/generate-dbt-project-roundtrip-capability-status.test.cjs
    cypressCoverage: not_applicable:governance_read_model
    unitTests: [scripts/generate-dbt-project-roundtrip-capability-status.test.cjs]
```

The detailed delivery record is historical and remains at `archived_record`.
