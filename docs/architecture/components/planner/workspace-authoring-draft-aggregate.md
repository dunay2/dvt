---
title: Workspace authoring draft aggregate
status: Active
owner: Architecture / Contracts / API / Web
last_reviewed: 2026-08-13
---

# Workspace authoring draft aggregate

This local component guide describes the graph-first editable draft aggregate
used by Canvas authoring and protected workspace draft persistence.

The normative contract sources remain:

- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringCommand.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts`
- [Execution selection and executable subgraph v1](../../../contracts/planner/execution-selection-and-executable-subgraph-v1.md)
- [Workspace graph draft persistence v1](../../../contracts/planner/workspace-graph-draft-persistence-v1.md)

## Owned concern

The component owns editable workspace graph truth:

- visible node membership
- node positions
- semantic node records
- semantic edge records
- protected draft persistence envelopes

It does not own HTTP transport, auth, audit storage, compare-and-swap storage,
React Flow viewport state, compile projection, or runtime execution.

## Erosion path to prevent

Do not let the protected API become a shadow engine.

The forbidden drift is:

1. UI starts as a generic API client.
2. API compiles, stores, validates, and admits from one path.
3. API adds run policy decisions.
4. API adds retry and recovery semantics.
5. API becomes a shadow engine.

The component boundary keeps these concerns apart: UI handles authoring
interaction, API handles protected commands, Planner handles compile projection,
and Engine/runtime handles execution lifecycle.

## Public API

- `WorkspaceGraphAuthoringDraft`
  Editable aggregate root persisted as protected draft payload.
- `WorkspaceGraphAuthoringCommand`
  Serializable pure aggregate mutation vocabulary.
- `WorkspaceGraphDraftSaveRequest`
  Protected write command with scope, schema version, expected revision,
  idempotency key, and authoring draft.
- `WorkspaceGraphDraftReadResponse`
  Protected read outcome with capability, audit reference, format metadata, and
  authoring draft record.
- `WorkspaceGraphDraftSaveResponse`
  Protected write outcome: `saved`, `conflict`, `denied`,
  `unsupported_schema_version`, `idempotency_mismatch`, or
  `authoring_authority_conflict`.

## Invariants

- `nodeIds` are unique.
- `nodePositions` exist for exactly the visible `nodeIds`.
- visible node ids reference declared semantic nodes.
- semantic node ids are unique.
- semantic edge ids are unique.
- semantic edges reference declared semantic nodes.
- zero nodes, one node, disconnected graphs, and partially connected graphs are
  valid authoring states.
- compile invariants do not belong to the persisted aggregate.
- the canonical Substrait execution plan is derived only after selection; it is
  not the editable persistence payload.
- All declared Canvas identities (main, active, and secondary) are graph-owned
  for authority conflict checks.
- Authentication, authorization, and current Canvas authority are evaluated
  before idempotent replay; revoked authority may refuse a prior replay.
- Unsupported stored schema versions fail closed. No migration-state or
  compatibility path exists in this rail.
- A `dvt:transform` node may remain unconfigured, but once its
  `transformAuthoring` metadata exists it must decode as the exact pinned
  Substrait Plan and validate its semantic digest, profile coordinates and DVT
  sidecar binding.
- The same aggregate parser governs protected save and reload. A malformed or
  unsupported semantic document cannot be stored as current truth and cannot
  be returned as a valid draft.

## User stories

- As a data author, I can save the first node before the graph is compile-ready.
- As a data author, I can keep disconnected draft work on the canvas without
  blocking another selected executable node.
- As an operator, I can run/preview an explicit selected node or subgraph rather
  than the whole draft.
- As an API caller, I receive typed conflict, denied, and format-error outcomes
  instead of silent fallback.
- As a frontend maintainer, I can project authoring truth into React Flow state
  without making the viewport the aggregate authority.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> EmptyDraft
  EmptyDraft --> AuthoringDraft: add_node
  AuthoringDraft --> AuthoringDraft: update_node / move_node
  AuthoringDraft --> AuthoringDraft: connect_nodes / disconnect_nodes
  AuthoringDraft --> StructurallyInvalid: missing node ref or bad edge ref
  StructurallyInvalid --> AuthoringDraft: repair aggregate structure
  AuthoringDraft --> SaveAttempt: save with revision and idempotency key
  SaveAttempt --> Saved: persisted
  SaveAttempt --> Conflict: stale revision
  SaveAttempt --> Denied: capability denies write
```

Save success means the editable draft is persisted. It does not mean the whole
draft is compile-ready.

## Durable semantic document boundary

```mermaid
flowchart LR
  Transform["dvt:transform metadata"] --> Aggregate[WorkspaceGraphAuthoringDraft]
  Aggregate --> Decode["Pinned Substrait decode + SHA/profile/sidecar validation"]
  Decode --> Save[SaveWorkspaceGraphDraft]
  Save --> Jsonb[(Existing draft_json JSONB/CAS)]
  Jsonb --> Get[GetWorkspaceGraphDraft]
  Get --> Decode
  Legacy[SQL/VTX1 authority] -. fail closed .-> Decode
```

The decoder is a contract invariant, not a new persistence owner. PostgreSQL
stores the aggregate exactly; projections remain read-only consumers and never
write back as semantic authority.

## Component map

```mermaid
flowchart LR
  Web["apps/web Canvas authoring"] --> WebPort["IWorkspaceGraphDraftAuthoringPort"]
  WebPort --> Api["apps/api protected draft routes"]
  Api --> App["Get/SaveWorkspaceGraphDraftUseCase"]
  App --> Boundary["WorkspaceGraphDraft.v1 envelope"]
  Boundary --> Root["WorkspaceGraphAuthoringDraft root"]
  Root --> Projection["selected-subgraph projection"]
  Projection --> Plan["Canonical Substrait plan"]
  Plan --> PreviewRun["Preview / Run"]
```

## Execution selection rule

```mermaid
flowchart TD
  Draft["WorkspaceGraphAuthoringDraft"] --> Selection["ExecutionSelection"]
  Selection --> Closure["Executable selected closure"]
  Draft --> Loose["Loose unrelated nodes"]
  Closure --> Compile["Compile selected subgraph"]
  Loose -. ignored unless selected .-> Compile
```

An unrelated loose node does not block running a selected executable SQL node.
Selecting the loose node directly requires that selected node and its dependency
closure to be executable.

The dedicated execution-selection seam now lives in the companion local guide:
[Execution selection component](./execution-selection-component.md).

The dedicated planner-owned selected-closure derivation seam now lives in:
[Executable subgraph derivation component](./executable-subgraph-derivation-component.md).

## End-to-end selected execution flow

```mermaid
sequenceDiagram
  participant Canvas as apps/web Canvas
  participant WebSelection as canvasRunSelection.ts
  participant PreviewPort as IPlansPort.previewPlan
  participant PreviewRoute as POST /plans/preview
  participant PreviewUseCase as PreviewPlanUseCase
  participant Resolver as ResolveAuthorizedExecutableSubgraphService
  participant Planner as PlannerFacade
  participant PlanStore as planStore + validator
  participant RunPort as IRunsPort.startRun
  participant StartRoute as POST /runs/start
  participant StartUseCase as PlannerBackedStartRunUseCase / delegate

  Canvas->>WebSelection: collectPreviewSelection(selectedNodeIds, workspaceNodeIds)
  WebSelection-->>Canvas: ExecutionSelection
  Canvas->>PreviewPort: previewPlan(graphSource, selection, persist=true)
  PreviewPort->>PreviewRoute: canonical preview payload
  PreviewRoute->>PreviewUseCase: execute(command, authorized context)
  PreviewUseCase->>Resolver: execute(selection, graphSource, context)
  Resolver->>Planner: deriveExecutableSubgraph(draft, selection)
  Planner-->>Resolver: ExecutableSubgraph
  Resolver-->>PreviewUseCase: selected closure or explicit rejection
  PreviewUseCase->>Planner: buildPlan(selected closure)
  PreviewUseCase->>PlanStore: storePlan + validatePlan
  PlanStore-->>PreviewUseCase: persisted valid PlanRef
  PreviewUseCase-->>Canvas: plan + PlanRef + persisted preview proof
  Canvas->>WebSelection: collectPlanSelection(plan)
  WebSelection-->>Canvas: ExecutionSelection
  Canvas->>RunPort: startRun(planRef, workspaceScope, selection)
  RunPort->>StartRoute: canonical start-run payload
  alt planner-backed start without planRef
    StartRoute->>StartUseCase: execute(graphSource, selection)
    StartUseCase->>Resolver: execute(selection, graphSource, context)
    Resolver->>Planner: deriveExecutableSubgraph(draft, selection)
    StartUseCase->>Planner: buildPlan(selected closure)
  else persisted preview run with planRef
    StartRoute->>StartUseCase: execute(planRef, selection)
    StartUseCase->>StartUseCase: delegate using persisted PlanRef
  end
```

```mermaid
flowchart LR
  Canvas["Canvas state + node selection"] --> WebSelection["canvasRunSelection.ts"]
  WebSelection --> PreviewPort["IPlansPort.previewPlan"]
  WebSelection --> RunPort["IRunsPort.startRun"]
  PreviewPort --> PreviewRoute["apps/api /plans/preview"]
  RunPort --> StartRoute["apps/api /runs/start"]
  PreviewRoute --> Resolver["ResolveAuthorizedExecutableSubgraphService"]
  StartRoute --> StartUseCase["PlannerBackedStartRunUseCase / delegate"]
  Resolver --> Planner["PlannerFacade.deriveExecutableSubgraph"]
  Planner --> Build["planner.buildPlan(selected closure)"]
  Build --> PlanStore["planStore + validator"]
  PlanStore --> Engine["engine start by PlanRef"]
```

The intended path is:

1. Canvas emits one canonical `ExecutionSelection`.
2. Preview persists proof for the selected closure only.
3. Run start reuses the persisted preview plan or, for planner-backed runtime
   starts, resolves the same selected closure before planner build.
4. Unrelated loose draft nodes remain editable but do not widen execution.

## Consumers

- `packages/@dvt/contracts/src/validation/planner.ts`
- `apps/api/src/application/ports/workspaceGraphDraft.ts`
- `apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts`
- `apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts`
- `apps/web/src/app/ports/workspaceGraphDraftAuthoring.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
- `apps/web/src/app/views/canvas/canvasDraftAuthoring.ts`
- `apps/web/src/app/views/canvas/canvasDraftRepository.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionSelection.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutableSubgraph.v1.ts`

## Extension rules

- Add authoring fields to `WorkspaceGraphAuthoringDraft.v1.ts` first.
- Keep persistence envelope fields in `WorkspaceGraphDraft.v1.ts`.
- Keep compile-only fields in compile projection contracts.
- Keep preview/run selection contracts in the execution-selection component.
- Add semantic contract tests for every new aggregate invariant.
- Do not add compatibility paths accepting compile artifacts as a save payload.
