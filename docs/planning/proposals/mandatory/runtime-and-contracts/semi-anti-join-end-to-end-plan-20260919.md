---
title: Semi and anti join end-to-end mechanization
status: Implemented
owner: dvt-web, dvt-api, contracts, postgres-projection
last_reviewed: 2026-09-19
planning_type: proposal
---

# Semi and anti join end-to-end mechanization

This document is the repository mechanization projection for
[GitHub issue #3320](https://github.com/dunay2/dvt/issues/3320). GitHub retains
task and closure authority; Planning DB retains architecture, rail, ownership,
and mechanization authority. The rationale and executable results are recorded
in [ED-20260919](../../../evidence/ED-20260919-semi-anti-join-end-to-end.md).

The slice admits the four exact standard Substrait SEMI/ANTI selectors and
reuses the existing Canvas authoring, relational-tree projection, selected
operation preview, plan preview, and run rails. Predicate fields include both
inputs, emitted fields include only the retained input, and PostgreSQL lowers
the queried input through `EXISTS` or `NOT EXISTS`.

```feature-mechanization
version: 1
featureId: GH-3320-SEMI-ANTI-JOIN-END-TO-END
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/semi-anti-join-end-to-end-plan-20260919.md
componentGuides:
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
  - docs/architecture/command-query-rail-governance.md
userStories:
  - https://github.com/dunay2/dvt/issues/3320
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
allowedImplementationSurfaces:
  - docs/.manifest.json
  - docs/evidence/ED-20260919-semi-anti-join-end-to-end.md
  - docs/evidence/index.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/semi-anti-join-end-to-end-plan-20260919.md
  - docs/risk-register/quality/index.md
  - packages/@dvt/contracts/src/contracts/planner/**
  - packages/@dvt/contracts/test/**
  - packages/@dvt/postgres-projection/src/**
  - packages/@dvt/postgres-projection/test/**
  - apps/api/test/**
  - apps/web/src/app/components/canvas/**
  - apps/web/src/app/plugins/graph/**
  - apps/web/src/app/views/canvas/**
  - apps/web/cypress/e2e/canvas/**
forbiddenImplementationSurfaces:
  - packages/@dvt/engine/**
  - packages/@dvt/state-store/**
  - packages/@dvt/adapter-*/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/application/ports/**
commandQueryRails:
  - name: ConfigureCanvasDvtNode
    type: command
    dddOwner: DvtNodeAuthoringMetadata
    referenceOnly: true
    authorityRef: docs/planning/proposals/mandatory/frontend-and-ux/vtx2-web-vtx1-authoring-hardcut-plan-20260903.md
  - name: ProjectCanvasRelationalTree
    type: query
    dddOwner: CanvasRelationalTreeProjection
    referenceOnly: true
    authorityRef: https://github.com/dunay2/dvt/issues/3266#issuecomment-5703815399
  - name: PreviewCanvasTransformRows
    type: query
    dddOwner: CanvasTransformDataSample
    referenceOnly: true
    authorityRef: https://github.com/dunay2/dvt/issues/3237
  - name: PreviewPlan
    type: command
    dddOwner: Planner preview boundary
    referenceOnly: true
    authorityRef: docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-generic-execution-workload-projection-plan-20260903.md
  - name: StartRun
    type: command
    dddOwner: Run command application service
    referenceOnly: true
    authorityRef: docs/architecture/system/subsystems/semantic-transformation/index.md
domainObjects:
  - name: DvtSubstraitSemanticDocumentV1
    type: aggregate
    owner: DVT semantic authoring
  - name: DvtSubstraitNInputJoinProjection
    type: read model
    owner: PostgreSQL projection
  - name: CanvasRelationalTreeProjection
    type: read model
    owner: Canvas semantic editor
fowlerSignals:
  - Parallel semantic model
  - SQL authoring leakage
  - Predicate and emitted-field scope conflation
architectureGuards:
  - pnpm --filter '@dvt/contracts' test
  - pnpm --filter '@dvt/postgres-projection' test
  - pnpm --filter '@dvt/web' test:architecture:run
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
completionGate:
  - pnpm --filter '@dvt/contracts' test
  - pnpm --filter '@dvt/postgres-projection' test
  - pnpm --filter dvt-api test
  - pnpm --filter '@dvt/web' test
  - pnpm --filter '@dvt/web' test:e2e:native -- --spec cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: retained-side-field-scope
    redTest: pnpm --filter '@dvt/postgres-projection' test
    expectedFailure: SEMI and ANTI selectors are rejected or expose queried-side fields as outputs.
    patchSurfaces:
      - packages/@dvt/postgres-projection/src/substraitJoinReadModel.ts
      - packages/@dvt/postgres-projection/src/substraitJoinReader.ts
      - packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts
    greenTest: pnpm --filter '@dvt/postgres-projection' test
  - id: exact-postgres-existence-semantics
    redTest: pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtSemiAntiJoinPostgres.integration.test.ts
    expectedFailure: Generated SQL cannot execute all four retained-side multiset semantics against PostgreSQL.
    patchSurfaces:
      - packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
      - packages/@dvt/postgres-projection/src/postgresAst.ts
      - apps/api/test/integration/dvtSemiAntiJoinPostgres.integration.test.ts
    greenTest: pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtSemiAntiJoinPostgres.integration.test.ts
  - id: canvas-exact-authoring-round-trip
    redTest: pnpm --filter '@dvt/web' test
    expectedFailure: Canvas cannot author, persist, reload, or safely switch the exact SEMI and ANTI selectors.
    patchSurfaces:
      - apps/web/src/app/views/canvas/**
      - apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    greenTest: pnpm --filter '@dvt/web' test
symbols:
  - name: encodeDvtSubstraitPlanV1
    path: packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanBinary.v1.ts
    dddOwner: DvtSubstraitSemanticDocumentV1
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/contracts' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts]
  - name: assertPinnedDvtSubstraitPlanV1
    path: packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanBinary.v1.ts
    dddOwner: DvtSubstraitSemanticDocumentV1
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/contracts' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts]
  - name: bytesToBase64
    path: packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanBinary.v1.ts
    dddOwner: DvtSubstraitSemanticDocumentV1
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/contracts' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts]
  - name: decodeDvtSubstraitPlanV1
    path: packages/@dvt/contracts/src/contracts/planner/DvtSubstraitPlanBinary.v1.ts
    dddOwner: DvtSubstraitSemanticDocumentV1
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/contracts' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts]
  - name: dvtSubstraitJoinRetainedSide
    path: packages/@dvt/postgres-projection/src/substraitJoinReadModel.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: isDvtSubstraitSemiAntiJoin
    path: packages/@dvt/postgres-projection/src/substraitJoinReadModel.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: PostgresJoinFieldBinding
    path: packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [Predicate and emitted-field scope conflation]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: buildSemiAntiJoinPostgresAst
    path: packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [SQL authoring leakage]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: semiAntiExists
    path: packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [SQL authoring leakage]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: pgRangeSubselect
    path: packages/@dvt/postgres-projection/src/postgresAst.ts
    dddOwner: DvtSubstraitNInputJoinProjection
    cqRails: [PreviewPlan, StartRun]
    fowlerSignals: [SQL authoring leakage]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts]
  - name: setDvtSubstraitJoinType
    path: apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
    dddOwner: DvtNodeAuthoringMetadata
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.test.ts]
  - name: resolveCanvasRelationalOperationChoices
    path: apps/web/src/app/views/canvas/canvasRelationalOperationChoices.ts
    dddOwner: DvtNodeAuthoringMetadata
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [apps/web/src/app/views/canvas/canvasRelationalOperationChoices.test.ts]
  - name: projectCanvasRelationalTree
    path: apps/web/src/app/views/canvas/canvasRelationalTreeProjection.ts
    dddOwner: CanvasRelationalTreeProjection
    cqRails: [ProjectCanvasRelationalTree]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    unitTests: [apps/web/src/app/views/canvas/canvasRelationalTreeProjection.test.ts]
```

No parallel semantic model, SQL-authoring rail, endpoint, store, or fake adapter
is introduced. The issue and evidence document carry the validation and closure
record.
