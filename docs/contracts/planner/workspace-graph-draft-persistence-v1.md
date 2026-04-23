---
title: Workspace graph draft persistence v1
status: Draft
owner: docs
last_reviewed: 2026-04-23
---

# Workspace graph draft persistence v1

## Purpose

`TF-A2` freezes the first canonical read/write persistence contract for editable
workspace graph drafts so `web`, `api`, and persistence owners share one typed
boundary.

This contract exists to block browser-local authority drift and route-local DTO
invention ahead of `TF-C4` and `TF-E2`.

## Normative sources

- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringCommand.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionSelection.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutableSubgraph.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowDesignGraph.v1.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/validation.ts`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`

## Scope and capability envelope

Every caller-visible read and write outcome carries:

- `scope` (`tenantId`, `projectId`, `environmentId`)
- capability mode (`writable`, `read_only`, `forbidden`)
- explicit `canRead` and `canWrite` booleans aligned with mode
- one governed reason from a closed vocabulary

The capability envelope is canonical and must not be replaced by UI-only
heuristics.

## Audit envelope and correlation

Every protected boundary outcome carries:

- `correlationId`
- `decisionId`
- `action` (`draft_read` or `draft_write`)
- `outcome` (`allowed`, `read_only`, `forbidden`, `conflict`)
- server `recordedAt`

`correlationId` is the join key across caller-visible behavior, audit evidence,
and runtime observability.

## Format evolution posture

Read success outcomes carry format metadata:

- `schemaVersion`
- `storedSchemaVersion`
- `migrationState` (`native` or `read_migrated`)

Typed format failures are explicit:

- `unsupported_schema_version`
- `corrupt_payload`
- `migration_failed`

Unsupported or corrupt drafts fail closed through typed outcomes; they do not
silently degrade to empty canvas behavior.

## Compare-and-swap and idempotency

Write requests must include:

- `expectedRevision` (compare-and-swap token)
- `idempotencyKey` (logical save retry identity)
- typed graph draft payload

Write outcomes are explicit and typed:

- `saved`
- `conflict`
- `denied`

The v1 merge posture is reject-on-stale. The server does not auto-merge
concurrent edits in this contract line.

## Authoring aggregate posture

`WorkspaceGraphDraft.v1` persists `WorkspaceGraphAuthoringDraft` as editable
authoring truth. The payload can represent zero nodes, one node, disconnected
graphs, and partially connected graphs. Those states are valid authoring states
even when they are not compile-ready.

`DesignGraphDraft` remains a derived preview/run artifact. It must not be
accepted as the protected draft save payload.

```mermaid
flowchart LR
  Draft["WorkspaceGraphAuthoringDraft"] --> Save["WorkspaceGraphDraftSaveRequest"]
  Draft --> Selection["ExecutionSelection"]
  Selection --> Subgraph["Executable selected subgraph"]
  Subgraph --> Compile["DesignGraphDraft"]
  Save -. must not accept .-> Legacy["DesignGraphDraft as editable payload"]
```

## Selection-to-execution seam

Preview and run must now cross two explicit contracts after draft persistence:

- `ExecutionSelection` carries operator intent only
- `ExecutableSubgraph` carries the derived selected closure and diagnostics

That seam prevents unrelated loose nodes from becoming implicit whole-draft
blockers and keeps compile/runtime concerns out of the persisted draft
envelope.

## Consumer rule

- `api` must validate protected draft read/write boundaries against the shared
  contract.
- `web` must adopt the workspace draft boundary and remove local persistence
  authority from product paths.
- `web` and `api` must preserve capability, audit, and format metadata to keep
  diagnosis and recovery deterministic.
- `web` draft reads in `api` mode must call
  `GET /workspace/graph/draft?tenantId=<...>&projectId=<...>&environmentId=<...>`
  and parse the canonical `WorkspaceGraphDraftReadResponse` envelope instead of
  assuming a bare record payload.
- `web` draft writes in `api` mode must send the canonical
  `WorkspaceGraphDraftSaveRequest` body, including protected `scope`, active
  `schemaVersion`, explicit `expectedRevision`, `idempotencyKey`, and typed
  draft payload.
- `web` should isolate that protected boundary behind a dedicated draft
  authoring port that preserves boundary-native outcomes before any projection
  into route-level DTOs:
  - read path: canonical `WorkspaceGraphDraftReadResponse` plus explicit
    `not_found`
  - write path: canonical `WorkspaceGraphDraftSaveResponse` plus explicit
    transport-governed `unsupported_schema_version` and `idempotency_mismatch`
  - capability, audit, and format metadata must survive that seam intact
- `web` must treat `WorkspaceGraphDraftSaveResponse` as an outcome envelope:
  `saved` returns `revision`, `conflict` returns `currentRevision`, and callers
  that need the materialized record must perform a follow-up scoped read rather
  than inventing `{ record }` or `{ current }` response shapes.
- `WorkspaceGraphDraft.v1` is structural draft authority. It governs scoped
  node identity, typed node payloads, typed edges, and persisted authoring node
  positions. Any React Flow viewport state beyond those positions remains a
  web projection concern.
- preview and run callers must produce canonical `ExecutionSelection` payloads
  and consume planner-derived `ExecutableSubgraph` results instead of assuming
  whole-draft compile.

## Related

- [Planner contracts index](./index.md)
- [Execution selection and executable subgraph v1](./execution-selection-and-executable-subgraph-v1.md)
- [Transformation flow preview and design graph v1](./TransformationFlowPreview.v1.md)
- [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
