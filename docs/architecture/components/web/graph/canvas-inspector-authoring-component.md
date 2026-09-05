---
title: Canvas Inspector Authoring Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-09-05
planning_type: architecture
---

# Canvas Inspector Authoring Component

## Purpose

This component owns governed node-detail editing in the route-level Canvas Inspector. It
projects one local draft, validates it, and applies accepted changes through the existing
Canvas draft aggregate.

It does not make the passive plugin Inspector writable, persist React Flow presentation
state as semantic truth, or create a second transform authority.

## Governing Sources

- [Command/query rail governance](../../../command-query-rail-governance.md)
- [Canvas Workbench command/query catalog](./canvas-workbench-command-query-catalog.md)
- [Graph Canvas Runtime Model](./graph-canvas-runtime-model.md)
- [Semantic Transformation](../../../system/subsystems/semantic-transformation/index.md)
- [VTX1 authoring authority hard cut](../../../../planning/proposals/mandatory/frontend-and-ux/vtx2-web-vtx1-authoring-hardcut-plan-20260903.md)

## Command Rail

| Attribute        | Canonical value                                                 |
| ---------------- | --------------------------------------------------------------- |
| Command          | `ConfigureCanvasDvtNode`                                        |
| Bounded context  | Web Graph Canvas Workbench                                      |
| DDD owner        | `DvtNodeAuthoringMetadata`                                      |
| Application seam | `useCanvasInspectorCommands`                                    |
| Adapter surface  | route-owned Inspector and graph-column controls                 |
| Authority        | `DvtTransformAuthoringAuthorityV1` canonical Substrait envelope |
| Mutation target  | `CanvasDraftSession.workingSet.upsertNode`                      |

There is no separate SQL command, visual-recipe command, column-mapping store, or React Flow
edge authority for this intent.

A shared `dvt:transform` with external dbt authority uses `ConfigureCanvasDbtNode` for supported
export and round-trip metadata, while its file-backed code follows the explicit workspace-file
write-back rails. A DVT-native Model uses `ConfigureCanvasDvtNode` and canonical Substrait
authority. Both use the same `dvt:transform` kind, product card, and Canvas node shell. The
authority metadata selects valid mutation commands; it does not create another Model kind.
Neither the Inspector draft nor graph metadata accepts generated SQL as an implicit authoring
authority.

## Public Contracts

| Contract                           | Responsibility                                     |
| ---------------------------------- | -------------------------------------------------- |
| `CanvasInspectorNodeDraft`         | local semantic editing DTO                         |
| `DvtNodeAuthoringMetadata`         | stable Source, canonical Transform, and sink union |
| `DvtTransformAuthoringAuthorityV1` | strict Substrait semantic-document envelope        |
| `CanvasColumnMappingSource`        | typed source field identity                        |
| `CanvasColumnMappingTarget`        | typed Transform output identity                    |
| `CanvasColumnMappingResult`        | applied draft or typed rejection                   |
| `CanvasColumnLineage`              | derived visible field handles and edges            |
| `DbtNodeAuthoringMetadata`         | external dbt round-trip metadata                   |
| `DbtModelArtifactProjection`       | generated read-only dbt SQL artifact               |

An empty Transform is explicitly `uninitialized`. Its first admitted authoring action creates
one canonical Substrait projection or composition. Removed SQL/VTX1 metadata fails closed.
An imported Source is a stable physical-origin boundary. It retains connection authority,
object identity, schema and provenance, but it cannot carry `FilterRel` or another operation that
changes the relation. Those operations require an explicit connected Transform.

## Invariants

- Inspector editability comes from `CanvasRuntimePolicy.commands`.
- Apply and column gestures mutate the same `CanvasDraftSession` authority.
- A DVT Transform has zero authority while uninitialized and exactly one canonical Substrait
  semantic document after its first accepted mutation.
- A connection-backed Source cannot own Transform operations. Legacy Source envelopes are
  normalized to their filter-free base relation without changing physical identity or provenance.
- Source cards never offer column reordering, functions, filters, calculated columns, or casts;
  those relation-changing operations start on a connected Model / Transform.
- External dbt Model mutations that cannot round-trip fail closed. They never trigger an implicit
  authority transition or discard dbt identity/configuration.
- Editable SQL, VTX1 recipes, SQL mirrors, and visual-to-SQL conversion are not supported
  authoring states.
- A dbt-compatible Model never adopts `metadata.sql` or `metadata.config.sql`; legacy values
  are stripped when supported metadata is applied and ignored by artifact projection.
- Column order, output inclusion, functions, aliases, descriptions, and multi-input
  composition are mutations of the canonical semantic document.
- React Flow field edges are derived lineage projections. Deleting a projected field edge
  invokes the mapping command; it does not persist an independent edge model.
- Automap accepts only one unique exact-name match with a known compatible type.
- Projection editing admits one connected source. Multi-input semantics use explicit
  Substrait join or set composition.
- Unsupported semantic shapes and incompatible functions fail closed.
- Visible copy is resolved by the Canvas copy catalog, not embedded in strategies or domain
  policies.
- Layout, disclosure, hover cards, and workbench position remain presentation state.
- Generic Canvas readiness does not acquire dbt- or DVT-specific definition rules.

## Focused Responsibilities

| Module                                    | One reason to change                          |
| ----------------------------------------- | --------------------------------------------- |
| `canvasInspectorAuthoringModel.ts`        | Inspector draft projection and validation     |
| `canvasDvtAuthoringModel.ts`              | dispatch authoring by DVT node kind           |
| `canvasDvtSourceAuthoring.ts`             | source identity and connection authority      |
| `canvasDvtSourceSemanticAuthoring.ts`     | stable Source relation normalization          |
| `canvasDvtTransformAuthoring.ts`          | canonical Transform shape decode/encode       |
| `canvasDvtSinkAuthoring.ts`               | sink materialization and write policy         |
| `canvasDvtTransformAuthoringAuthority.ts` | strict authority envelope                     |
| `canvasColumnMappingModel.ts`             | typed mapping contracts and node-column reads |
| `canvasColumnProjectionAuthority.ts`      | canonical projection read/persistence         |
| `canvasColumnMappingAuthoring.ts`         | one field mapping or removal                  |
| `canvasColumnAutomap.ts`                  | deterministic compatible automapping          |
| `canvasColumnOutputAuthoring.ts`          | output inclusion and order                    |
| `canvasColumnLineageProjection.ts`        | field-handle and lineage read model           |
| `canvasDvtSubstraitFilter.ts`             | strict Transform FilterRel mutation           |
| `DvtAuthoringFields.tsx`                  | route DVT authoring to focused views          |

## Flow

```mermaid
flowchart LR
  Source[Stable Source / ReadRel] --> Edge[Explicit edge]
  Edge --> Gesture[Transform Inspector or field gesture]
  Gesture --> Command[ConfigureCanvasDvtNode]
  Command --> Draft[CanvasInspectorNodeDraft]
  Draft --> Validate[Typed validation]
  Validate --> Session[CanvasDraftSession]
  Session --> Authority[DvtTransformAuthoringAuthorityV1]
  Authority --> Semantic[Canonical Transform document]
  Semantic --> Card[Transform card and field projection]
  Semantic --> Preview[Derived Preview / SQL]
```

## Negative Behavior

The command rejects or fails closed for:

- removed SQL/VTX1 metadata;
- an unsupported DVT target or semantic shape;
- a Source attempting to retain or execute `FilterRel`;
- a source without a stage dependency;
- absent or ambiguous source fields;
- unknown or incompatible types during automap;
- functions outside the admitted provider capability profile;
- editing a complex expression as a simple passthrough;
- using one projection as a hidden multi-source composition;
- read-only runtime posture.

## Behavioral Evidence

- `canvasDvtTransformAuthoringAuthority.test.ts`
- `canvasColumnMappingAuthoring.test.ts`
- `canvasColumnLineageProjection.test.ts`
- `canvasColumnFunctionAuthoring.test.ts`
- `canvasAlgebraicComposition.test.ts`
- `canvasDvtSubstraitPilot.test.ts`
- `canvasDvtSubstraitFilter.test.ts`
- `DvtAuthoringFields.test.tsx`
- `canvas-source-filter-authoring.cy.ts` (Source/Transform ownership boundary)
- `dvt-transform-authoring-authority.contract.test.ts`

The architecture absence guard proves retired modules and public names are not reintroduced;
behavior tests prove accepted/rejected mutations and their persisted semantic result.

## Drift To Watch

- restoring editable SQL or a visual recipe as Transform authority;
- exposing Transform operations on a Source or projecting them as Source card state;
- keeping a generated SQL mirror beside the semantic document;
- persisting presentation edges as mapping truth;
- guessing unknown or ambiguous automaps;
- embedding visible copy in policies or graph strategies;
- growing the dispatcher with source, Transform, or sink implementation detail;
- introducing a second command for the same authoring intent.
