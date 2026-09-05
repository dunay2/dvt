# VTX2 Shared Source/Model Vocabulary Hard Cut

Status: Implemented
Issue: [#2903](https://github.com/dunay2/dvt/issues/2903)
Decision owner: [#2737](https://github.com/dunay2/dvt/issues/2737)

Planning follows
[Fowler opportunity governance](../../../../architecture/fowler-opportunity-planning-governance.md).

## Decision

Canvas has one Source kind (`dvt:source`) and one Model kind
(`dvt:transform`). dbt compatibility is metadata on either kind. It may select
external file round-trip or execution behavior, but it does not create a dbt
Source/Model profile, kind, card, or renderer.

Rows and bytes remain part of the shared Source/Model card read model. The card
shows observed evidence when present and `Not calculated` when it is absent.

Source declares a physical relation. Relation-changing operations belong to a
connected Model. External dbt edits that cannot round-trip fail closed; no
automatic node-kind conversion or silent authority loss is allowed.

## Fowler Planning Matrix

| Smell                  | Decision                                                    | Proof                          |
| ---------------------- | ----------------------------------------------------------- | ------------------------------ |
| Duplicate semantics    | Delete dbt Source/Model kinds and share card projection     | card and registry tests        |
| Hidden authority       | Keep dbt identity and write-back facts as explicit metadata | projection and Workbench tests |
| Divergent change       | Centralize dbt compatibility predicates                     | Canvas unit tests              |
| Speculative generality | Delete species conversion and Source operation helpers      | architecture guards            |

## Command And Query Rails

- `ProjectGraphNodeCardReadModel` queries the shared card, including row and
  byte evidence.
- `ConfigureCanvasDbtNode` changes supported dbt compatibility metadata.
- `ConfigureCanvasDvtNode` changes native Model semantics.
- `GetWorkspaceGraphDraft` reads the persisted graph without aliases or dual
  writes.

```feature-mechanization
version: 1
featureId: VTX2-SHARED-SOURCE-MODEL-VOCABULARY-2903
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/vtx2-shared-source-model-vocabulary-hardcut-plan-20260905.md
componentGuides: [docs/architecture/components/web/graph/graph-frontend-architecture.md, docs/architecture/components/web/graph/canvas-inspector-authoring-component.md, docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md]
userStories: [https://github.com/dunay2/dvt/issues/2903]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md, https://github.com/dunay2/dvt/issues/2737]
allowedImplementationSurfaces: [apps/web/src/**, apps/web/cypress/**, docs/**]
forbiddenImplementationSurfaces: [packages/@dvt/contracts/**, packages/@dvt/engine/**, packages/@dvt/planner/**, packages/@dvt/adapter-*/**, apps/api/**, infra/db/**, new node kinds, compatibility aliases, feature flags, dual writes]
commandQueryRails:
  - { name: ProjectGraphNodeCardReadModel, type: query, status: implemented, dddOwner: CanvasGraphPresentation, applicationPort: Graph node card strategy, adapterSurface: shared Source/Model card, authorizationScope: authorized Canvas graph projection, negativeTests: [missing evidence renders Not calculated] }
  - { name: ConfigureCanvasDbtNode, type: command, status: implemented, dddOwner: CanvasDraftSession, applicationPort: Canvas inspector commands, adapterSurface: dbt compatibility metadata, authorizationScope: active editable graph or external file authority, negativeTests: [unsupported mutation fails closed] }
  - { name: ConfigureCanvasDvtNode, type: command, status: implemented, dddOwner: CanvasDraftSession, applicationPort: Canvas inspector commands, adapterSurface: native Model semantics, authorizationScope: active editable graph, negativeTests: [Source rejects relation-changing operations] }
  - { name: GetWorkspaceGraphDraft, type: query, status: implemented, dddOwner: WorkspaceGraphDraftRecord, applicationPort: workspace graph query port, adapterSurface: Canvas graph projection, authorizationScope: active workspace, negativeTests: [dbt Source and Model aliases are rejected] }
domainObjects:
  - { name: CanonicalNode, type: entity, owner: Canvas graph }
  - { name: DbtNodeAuthoringMetadata, type: value object, owner: Canvas dbt compatibility }
  - { name: GraphNodeCardReadModel, type: read model, owner: Canvas graph presentation }
fowlerSignals: [Duplicate semantics, Hidden authority, Divergent change, Speculative generality]
architectureGuards: [pnpm --filter @dvt/web test:architecture:run]
cypressFlows: [apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts]
completionGate: [pnpm --filter @dvt/web test -- --run, pnpm --filter @dvt/web lint, pnpm --filter @dvt/web typecheck, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
redGreenCycles:
  - { id: shared-card, redTest: apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts, expectedFailure: Source and Model still select authority-specific cards., patchSurfaces: [apps/web/src/app/plugins/graph/sharedSourceModelGraphNodeCardStrategy.ts], greenTest: pnpm --filter @dvt/web test:unit:run -- graphNodeCardReadModel.test.ts }
  - { id: unique-kinds, redTest: apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts, expectedFailure: dbt Source and Model registrations still exist., patchSurfaces: [apps/web/src/app/plugins/registry.ts, apps/web/src/app/plugins/nodeTypeCatalog.dbt.ts], greenTest: pnpm --filter @dvt/web test:architecture:run }
  - { id: source-boundary, redTest: apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.test.ts, expectedFailure: Source still accepts relation-changing operations., patchSurfaces: [apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.ts], greenTest: pnpm --filter @dvt/web test:unit:run -- canvasDvtSourceSemanticAuthoring.test.ts }
symbolDefaults: &symbolDefaults { dddOwner: CanvasGraphPresentation, cqRails: [ProjectGraphNodeCardReadModel, ConfigureCanvasDbtNode, ConfigureCanvasDvtNode, GetWorkspaceGraphDraft], fowlerSignals: [Duplicate semantics, Hidden authority], architectureGuard: pnpm --filter @dvt/web test:architecture:run, cypressCoverage: apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts }
symbols:
  - { <<: *symbolDefaults, name: addDbtNode, path: apps/web/cypress/e2e/canvas/canvas-graph-search-filter-live.cy.ts, unitTests: [apps/web/cypress/e2e/canvas/canvas-graph-search-filter-live.cy.ts] }
  - { <<: *symbolDefaults, name: supportsDbtInspector, path: apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx, unitTests: [apps/web/src/app/plugins/dbt/DbtNodeRenderer.test.tsx] }
  - { <<: *symbolDefaults, name: containsDbtCompatibilityMetadata, path: apps/web/src/app/plugins/graph/sharedSourceModelGraphNodeCardStrategy.ts, unitTests: [apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts] }
  - { <<: *symbolDefaults, name: DbtCompatibilityNode, path: apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts, unitTests: [apps/web/src/app/views/canvas/canvasDbtAuthoringModel.test.ts] }
  - { <<: *symbolDefaults, name: hasDbtCompatibilityMetadata, path: apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts, unitTests: [apps/web/src/app/views/canvas/canvasDbtAuthoringModel.test.ts] }
  - { <<: *symbolDefaults, name: isDbtCompatibleModel, path: apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts, unitTests: [apps/web/src/app/views/canvas/canvasDbtAuthoringModel.test.ts] }
  - { <<: *symbolDefaults, name: isDbtCompatibleSource, path: apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts, unitTests: [apps/web/src/app/views/canvas/canvasDbtAuthoringModel.test.ts] }
  - { <<: *symbolDefaults, name: resolveDbtExecutableStepKind, path: apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts, unitTests: [apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts] }
  - { <<: *symbolDefaults, name: FILE_AUTHORITY_SOURCE_IMPORT_KINDS, path: apps/web/src/app/views/canvas/useDbtProjectFilesAuthoritySurface.tsx, unitTests: [apps/web/src/app/views/canvas/dbtProjectFilesAuthoritySourceImport.test.ts] }
```
