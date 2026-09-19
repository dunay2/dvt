---
title: Cross join end-to-end mechanization
status: Implemented
owner: dvt-web, dvt-api, contracts, postgres-projection
last_reviewed: 2026-09-19
planning_type: proposal
---

# Cross join end-to-end mechanization

This document is the repository mechanization projection for
[GitHub issue #3322](https://github.com/dunay2/dvt/issues/3322). GitHub retains
task and closure authority; Planning DB retains architecture, rail, ownership,
and mechanization authority.

The slice admits the exact standard `substrait.CrossRel` identity and reuses
the existing Canvas authoring, relational-tree projection, selected-operation
preview, plan preview, and run rails. It does not add a `JoinRel.JoinType`, a
synthetic predicate, a SQL-authoring model, or an operator-specific endpoint.

## Current and target state

The current bounded profile can compose JOIN and Set relations but rejects a
CrossRel before provider execution:

```text
Canvas Sources -> JoinRel/SetRel authoring -> selected relation -> PostgreSQL
                    X CrossRel (not admitted, not traversed, not projected)
```

The target keeps one canonical semantic document and lowers it only at the
PostgreSQL adapter boundary:

```text
Source A ---\
             CrossRel(A, B) ---\
Source B ---/                    CrossRel(previous, C) -> Project/Root -> Output
Source C ----------------------/
                  |                    |
                  +-- selected preview+-- PreviewPlan / StartRun
                                      |
                                      +-- PostgreSQL CROSS JOIN
```

For three or more sources, association is explicit and left-preserving:
`CrossRel(CrossRel(A, B), C)`. Mixed subtrees retain their authored boundaries;
an outer JOIN below a CROSS is never reassociated across that CROSS.

## Solution rationale

- **Canonical identity:** Cross is `substrait.CrossRel`, category `relation`,
  `sourceKind: core`. It has binary `left` and `right` inputs, optional
  `RelCommon.emit`, and no condition.
- **Semantic output:** the direct field space is left fields followed by right
  fields. `emit` may select or reorder that space. Duplicates and NULL values
  remain unchanged; an empty input produces no rows.
- **Execution projection:** PostgreSQL receives a real `CROSS JOIN`. A source
  cannot be elided merely because none of its columns are emitted: it still
  controls multiplicity and emptiness.
- **Authoring:** CROSS is selected deliberately. It neither searches for equal
  field names nor inherits JOIN predicates. Apply and Cancel use the existing
  draft/revision authority.
- **Operational bounds:** selecting or applying CROSS does not query the
  warehouse. Preview and Run reuse the existing limits, timeout, cancellation,
  authorization, and workload rails. No hidden `COUNT(*)`, fabricated
  cardinality, or per-input semantic `LIMIT` is introduced.
- **Fail closed:** malformed binary shapes, unsupported nested shapes, invalid
  emit ordinals, stale identity/hash, and unauthorized inputs fail before the
  PostgreSQL provider.

```feature-mechanization
version: 1
featureId: GH-3322-CROSS-JOIN-END-TO-END
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/cross-join-end-to-end-plan-20260919.md
componentGuides:
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
  - docs/architecture/command-query-rail-governance.md
userStories:
  - https://github.com/dunay2/dvt/issues/3322
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
allowedImplementationSurfaces:
  - docs/.manifest.json
  - docs/evidence/**
  - docs/planning/proposals/**
  - docs/risk-register/quality/**
  - packages/@dvt/contracts/src/contracts/planner/**
  - packages/@dvt/contracts/test/**
  - packages/@dvt/postgres-projection/src/**
  - packages/@dvt/postgres-projection/test/**
  - apps/api/src/application/services/**
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
    applicationPort: ProjectCanvasRelationalTree query port
    adapterSurface: apps/web/src/app/views/canvas/canvasRelationalTreeProjection.ts#projectCanvasRelationalTree
    authorizationScope: authorized project and Canvas draft read scope
    negativeTests:
      - reject malformed CrossRel shapes and stale sidecars
      - reject missing topology, invalid authority, and ambiguous display identities
  - name: PreviewCanvasTransformRows
    type: query
    dddOwner: CanvasTransformDataSample
    referenceOnly: true
    authorityRef: https://github.com/dunay2/dvt/issues/3237
    applicationPort: PreviewCanvasTransformRows query port
    adapterSurface: apps/api/src/application/services/previewCanvasTransformRowsUseCase.ts#PreviewCanvasTransformRowsUseCase
    authorizationScope: authorized selected relation and all physical input scopes
    negativeTests:
      - reject invalid CrossRel output schemas before warehouse execution
      - reject unauthorized relation, unsupported plan shape, and stale semantic identity
  - name: PreviewPlan
    type: command
    dddOwner: Planner preview boundary
    referenceOnly: true
    authorityRef: docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-generic-execution-workload-projection-plan-20260903.md
    applicationPort: PreviewPlan application command
    adapterSurface: apps/api/src/application/services/dvtPostgresTransformProjection.ts#projectDvtPostgresTransform
    authorizationScope: authorized project, environment, selected graph, and all physical input scopes
    negativeTests:
      - reject unsupported CrossRel shapes before SQL projection
      - reject stale identity, unresolved physical inputs, and unauthorized preview scope
  - name: StartRun
    type: command
    dddOwner: Run command application service
    referenceOnly: true
    authorityRef: docs/architecture/system/subsystems/semantic-transformation/index.md
    applicationPort: StartRun application command
    adapterSurface: apps/api/src/application/services/dvtOperationalWorkloadProjector.ts#DvtOperationalWorkloadProjector
    authorizationScope: authorized project, environment, executable plan, and all physical input scopes
    negativeTests:
      - reject unsupported CrossRel workload before execution
      - reject stale plan identity, missing physical bindings, and unauthorized run scope
domainObjects:
  - name: DvtSubstraitSemanticDocumentV1
    type: aggregate
    owner: DVT semantic authoring
  - name: DvtSubstraitCrossProjection
    type: read model
    owner: PostgreSQL projection
  - name: CanvasRelationalTreeProjection
    type: read model
    owner: Canvas semantic editor
fowlerSignals:
  - Parallel semantic model
  - SQL authoring leakage
  - Predicate and CrossRel identity conflation
architectureGuards:
  - pnpm --filter '@dvt/contracts' test
  - pnpm --filter '@dvt/postgres-projection' test
  - pnpm --filter '@dvt/web' test:architecture:run
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
completionGate:
  - pnpm --filter '@dvt/contracts' test
  - pnpm --filter '@dvt/postgres-projection' test
  - pnpm --filter dvt-api test
  - pnpm --filter '@dvt/web' test
  - pnpm --filter '@dvt/web' test:e2e:native -- --spec cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: exact-crossrel-admission
    redTest: pnpm --filter '@dvt/contracts' test
    expectedFailure: CrossRel is absent from the exact standard capability catalogue and supported profile.
    patchSurfaces:
      - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
      - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
      - packages/@dvt/contracts/test/**
    greenTest: pnpm --filter '@dvt/contracts' test
  - id: cartesian-postgres-projection
    redTest: pnpm --filter '@dvt/postgres-projection' test
    expectedFailure: The projector rejects CrossRel or loses an input's multiplicity, output emit, or selected subtree.
    patchSurfaces:
      - packages/@dvt/postgres-projection/src/**
      - packages/@dvt/postgres-projection/test/**
    greenTest: pnpm --filter '@dvt/postgres-projection' test
  - id: canvas-crossrel-round-trip
    redTest: pnpm --filter '@dvt/web' test
    expectedFailure: Canvas cannot author, persist, reload, project, or preview the exact CrossRel chain.
    patchSurfaces:
      - apps/web/src/app/views/canvas/**
      - apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    greenTest: pnpm --filter '@dvt/web' test
symbols:
  - name: resolveCanvasRelationalOperationChoices
    path: apps/web/src/app/views/canvas/canvasRelationalOperationChoices.ts
    dddOwner: DvtNodeAuthoringMetadata
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    unitTests: [apps/web/src/app/views/canvas/canvasRelationalOperationChoices.test.ts]
  - name: projectCanvasRelationalTree
    path: apps/web/src/app/views/canvas/canvasRelationalTreeProjection.ts
    dddOwner: CanvasRelationalTreeProjection
    cqRails: [ProjectCanvasRelationalTree]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    unitTests: [apps/web/src/app/views/canvas/canvasRelationalTreeProjection.test.ts]
  - name: selectDvtSubstraitRelation
    path: packages/@dvt/postgres-projection/src/substraitRelationSelection.ts
    dddOwner: DvtSubstraitCrossProjection
    cqRails: [PreviewCanvasTransformRows, PreviewPlan]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/substraitRelationSelection.test.ts]
  - name: createDvtSubstraitCrossDraft
    path: apps/web/src/app/views/canvas/canvasDvtSubstraitCrossComposition.ts
    dddOwner: DvtNodeAuthoringMetadata
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Parallel semantic model]
    architectureGuard: pnpm --filter '@dvt/web' test:architecture:run
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    unitTests: [apps/web/src/app/views/canvas/CanvasRelationalTreeWorkbench.test.tsx]
  - name: projectDvtCrossDraftToPostgresSql
    path: packages/@dvt/postgres-projection/src/crossPostgresProjection.ts
    dddOwner: DvtSubstraitCrossProjection
    cqRails: [PreviewCanvasTransformRows, PreviewPlan, StartRun]
    fowlerSignals: [SQL authoring leakage]
    architectureGuard: pnpm --filter '@dvt/postgres-projection' test
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts
    unitTests: [packages/@dvt/postgres-projection/test/crossPostgresProjection.test.ts]
```

## Acceptance and closeout

The implementation must prove two-source and three-source products, duplicate
and NULL preservation, empty-input annihilation, output selection from only one
side, `RelCommon.emit` reorder, mixed admitted subtrees, intermediate preview,
Apply/Cancel/reload, authorization of both inputs, and generated SQL executed by
PostgreSQL. Tests compare multisets rather than relying on row order.

No new endpoint, store, StepKind, fake adapter, hidden cardinality query, or
parallel semantic representation is permitted. Completion requires the ARC
classification, affected package tests, full lint/type/build gates, native
Cypress flow, `pnpm verify:prepush`, and green GitHub checks on the integrated
candidate.
