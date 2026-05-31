---
title: Canonical Node Identity
status: Proposed
date: 2026-05-31
owners:
  - Web
  - Planner
  - Runtime
  - Traceability
arc_level: ARC-1
---

# ADR-0059: Canonical Node Identity

## Status

Proposed.

## Context

The Canvas currently allows several nodes to share the same visible title, for
example multiple cards called `Source 2`. This is not only a UX issue. In DVT,
node identity crosses multiple architectural surfaces:

- Canvas authoring draft and React Flow rendering;
- Project Nodes catalogue;
- Inspector metadata editing;
- planner graph source projection;
- ExecutionPlan step selection;
- lineage and artifacts;
- runs, cost, diff and code surfaces.

The current `WorkspaceGraphAuthoringNode` contract uses `id` and `name` as the
main node identity fields. Edges reference `sourceId` and `targetId`, and draft
validation already enforces that visible node IDs and edges reference declared
semantic node IDs. This is a strong foundation, but `name` is ambiguous: it can
mean a human title, a business object, an imported table/model reference, or an
auto-generated placeholder.

If DVT keeps using one visible `name` as both the user label and the business
reference, future rename operations can accidentally affect planning, lineage,
artifacts or run interpretation. The platform needs an explicit distinction
between immutable identity, human-facing label and semantic reference.

## Decision

DVT will define canonical node identity as a layered model:

```ts
nodeId       // immutable technical identity, currently WorkspaceGraphAuthoringNode.id
instanceId   // optional future runtime/instance identity when one definition is reused
kind         // plugin-qualified node kind, e.g. dbt:model, dvt:sql_transform
role         // input, transform, check, output, control
displayName  // editable human-facing label
semanticRef  // stable logical/business reference when available
shortId      // compact deterministic visual suffix derived from nodeId
```

For the current implementation generation, `WorkspaceGraphAuthoringNode.id` is
the canonical `nodeId`. `WorkspaceGraphAuthoringNode.name` remains the
human-facing display name until a contract migration introduces an explicit
`displayName` field. The semantic reference should be carried through typed
metadata first, then promoted to a first-class field only after contract and
migration planning.

The following rules are accepted:

1. Edges, persisted graph references, run linkage, lineage joins and plan
   projection use `nodeId`, not `displayName`.
2. `displayName` is mutable presentation metadata.
3. `semanticRef` is a stable data/workflow reference, not a UI label.
4. Automatic node names must be unique inside the active canvas.
5. Manual duplicate display names may be allowed, but the UI must show `shortId`
   for disambiguation.
6. A node rename must not mutate edges, run history, lineage, artifacts or plan
   identity.
7. Planner-facing graph projection must not depend on `displayName` as an
   authority for dependency identity.

## Identity taxonomy

### NodeDefinition

A logical reusable definition, such as a warehouse source, dbt model, SQL
transform template, test definition or sink target.

Potential future fields:

```ts
interface NodeDefinitionIdentity {
  definitionId: string;
  kind: string;
  semanticRef?: string;
  sourceArtifactRef?: string;
}
```

### NodeInstance

A graph/canvas instance of a definition. The same logical definition may appear
in multiple canvases or workspaces later.

Current equivalent:

```ts
WorkspaceGraphAuthoringNode.id
```

Potential future fields:

```ts
interface NodeInstanceIdentity {
  nodeId: string;
  definitionId?: string;
  canvasId: string;
  displayName: string;
  shortId: string;
}
```

### RuntimeStep

A planner/runtime executable unit derived from the graph. Today, simple plans may
map one node to one step, but this must not become a hard invariant. Future
planning can split one node into several steps or synthesize steps that do not
map one-to-one to authoring nodes.

Potential future fields:

```ts
interface RuntimeStepIdentity {
  stepId: string;
  sourceNodeId?: string;
  syntheticReason?: string;
}
```

## Cross-surface rules

| Surface | Identity authority | Presentation label |
| ------- | ------------------ | ------------------ |
| Canvas card | `nodeId` | `displayName` / `semanticRef` |
| Project Nodes panel | `nodeId` | `semanticRef ?? displayName` |
| Inspector | `nodeId` | editable `displayName` plus read-only identity fields |
| Edges | `sourceId`, `targetId` | none |
| Planner graph source | `nodeId` and stable step/source metadata | optional metadata only |
| ExecutionPlan | `stepId`, optional source node metadata | none |
| Lineage | run/step/artifact IDs plus source node metadata | optional label only |
| Cost | run/step/node correlation IDs | optional label only |
| Diff | structural IDs and semantic refs | user-facing labels for display |

## Current contract mapping

| Target concept | Current field | Notes |
| -------------- | ------------- | ----- |
| `nodeId` | `WorkspaceGraphAuthoringNode.id` | Already immutable by convention and referenced by edges. |
| `displayName` | `WorkspaceGraphAuthoringNode.name` | Should be treated as mutable presentation metadata. |
| `kind` | `WorkspaceGraphAuthoringNode.kind` + `pluginId` | Web projection already normalizes non-qualified kinds to `${pluginId}:${kind}`. |
| `semanticRef` | `path` or `metadata.semanticRef` | Needs standardization before promotion. |
| `shortId` | derived | Should be deterministic from `nodeId`; do not use as persistence authority. |

## Migration posture

This ADR does not require an immediate breaking contract change. The preferred
sequence is:

1. Treat current `id` as `nodeId` and current `name` as `displayName` in code and
   documentation.
2. Standardize `metadata.semanticRef` for imported/bound nodes.
3. Add UI projection helpers that derive `shortId`, primary title and secondary
   identity line.
4. Add tests proving rename does not mutate edges or planner projection.
5. Later, promote `displayName` and `semanticRef` to first-class contract fields
   in a versioned contract migration if needed.

## Consequences

Positive:

- The Canvas becomes less ambiguous without sacrificing internal identity.
- Renames become safe metadata changes.
- Planner, lineage, cost and diff can avoid accidental reliance on UI labels.
- Source import and future dbt-compatible import can bind semantic refs without
  turning table/model names into technical IDs.

Negative:

- There is one more projection layer between stored graph nodes and card UI.
- Short ID generation and duplicate detection need explicit tests.
- The contract will eventually need a versioned migration if `displayName` and
  `semanticRef` become first-class fields.

## Validation

The implementation track should add or verify:

- unit tests for short ID derivation;
- unit tests for duplicate-name disambiguation;
- component tests for card identity rendering;
- inspector tests exposing full identity;
- Project Nodes panel tests for meaningful labels;
- regression test proving rename does not mutate edge endpoints;
- planner projection test proving dependencies use node IDs, not display names.

## Related document

- `docs/architecture/components/web/canvas/node-identity-and-naming-policy.md`
