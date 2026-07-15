---
title: dbt Project Authoring Authority
status: Accepted
date: 2026-07-11
owners:
  - Web
  - API
  - Project Workspace I/O
  - dbt Integration
arc_level: ARC-2
---

# ADR-0060: dbt Project Authoring Authority

## Status

Accepted.

## Context

DVT currently authors dbt work from a protected
`WorkspaceGraphAuthoringDraft.v1`. Canvas nodes and edges are semantic input to
`GenerateDbtWorkspaceArtifacts`, which writes dbt files before preview. This is
a coherent graph-draft workflow.

An imported or opened dbt project has the opposite authority: its SQL, YAML,
CSV, macros, tests, and package declarations are the product truth. Regenerating
those files from a visual graph can normalize or destroy constructs that the
visual editor cannot represent losslessly.

The two models cannot be active for the same Canvas at the same time. Persisting
a file-backed project together with ignored graph-draft nodes and edges would
create shadow state, ambiguous writes, and an unsafe fallback path.

## Decision

DVT supports two mutually exclusive authoring authority modes:

```text
graph-draft
dbt-project-files
```

The active Canvas must have exactly one authority binding.

### graph-draft

`WorkspaceGraphAuthoringDraft.v1` remains the semantic aggregate. Its nodes and
edges are authoritative. `GenerateDbtWorkspaceArtifacts` may project that
aggregate into dbt files before preview.

### dbt-project-files

The scoped dbt project files are authoritative. A server-side dbt analyzer
produces `DbtProjectGraphProjection`; Canvas renders that query model. Visual
layout remains the existing route-local `CanvasLayoutProjection`, keyed by dbt
`unique_id` or another accepted canonical semantic identity.

File-backed Canvas state must not persist a second semantic node/edge graph in
`WorkspaceGraphAuthoringDraft.v1`. Analyzer failure leaves the project
file-backed and returns diagnostics or an unavailable projection. It never
falls back automatically to graph-draft authority.

## Authority Binding

Before file-backed behavior is implemented, a versioned contract must define a
`CanvasAuthoringAuthorityBinding` equivalent to:

```ts
type CanvasAuthoringAuthorityBinding =
  | {
      kind: 'graph-draft';
    }
  | {
      kind: 'dbt-project-files';
      projectRoot: WorkspacePath;
    };
```

This binding is not added to `WorkspaceGraphAuthoringDraft.v1` as an optional
field. Version 1 keeps its existing graph-first semantics. The new binding must
live in a versioned Canvas authoring document boundary so file-backed Canvas
documents do not carry ignored graph shape.

Project revision and analysis hash are observation/provenance values. They are
returned by file and projection queries and bound into preview/run receipts;
they are not a second authoring authority.

## Transitions

Allowed transitions are:

```text
none -> graph-draft
none -> dbt-project-files
graph-draft -> dbt-project-files through explicit adoption
```

Adoption succeeds only after generated files are durably written, dbt analysis
succeeds, and a parity check proves that the intended graph is represented. The
authority switch and its required file mutations must be atomic.

There is no automatic `dbt-project-files -> graph-draft` transition. A future
explicit migration would require its own losslessness policy and decision.

## Command And Query Rails

The following existing rails remain canonical and are extended in place:

- `ListWorkspaceFiles`
- `GetWorkspaceFileContent`
- `SaveWorkspaceFileContent`
- `GenerateDbtWorkspaceArtifacts`
- `BuildDbtPlannerGraphSource`
- `ImportWarehouseSources`
- `PreviewExecutionPlan`
- `ObservePlanRunReadiness`
- `StartRun`
- `GetRunStatus`
- `GetRunEvents`

`SaveDbtProjectFileEdit` and `RunPersistedDbtProject` remain retired synonyms.

The following product intents are planned, not implemented:

- `ValidateDbtProjectImport`
- `ImportDbtProject`
- `ProjectDbtGraphFromFiles`
- `ExportDbtProject`

They may be promoted only with a DDD owner, application port, adapter surface,
scope policy, failure vocabulary, and negative tests. A structured visual-edit
command is not accepted by this ADR; it must be introduced only when a concrete
lossless edit operation requires it.

## Workspace File Safety

File-backed authoring requires the existing workspace-file rails to gain:

- a stable content revision on reads;
- compare-and-swap on writes;
- an explicit stale-write rejection;
- atomic replacement in the local filesystem adapter;
- an atomic batch mutation boundary before import, adoption, or cross-file
  edits.

The browser may hold an editable buffer, but it cannot overwrite a newer
workspace revision silently.

`SaveWorkspaceFileContent` is the internal application command that performs a
conditional workspace-file mutation. It is not a user-facing `Save` action.
The Code workbench automatically synchronizes accepted edits into the project
working tree, serializes writes per file, and exposes `modified`, `syncing`,
`synchronized`, `conflict`, or `read-only` posture. A manual Save button would
create a second persistence lifecycle and is therefore rejected.

Git lifecycle operations remain distinct product intents. Writing the working
tree does not imply staging, committing, pushing, or claiming remote
synchronization. Those actions require their own accepted rails and a real Git
connector before they can be exposed.

## Source Import

`ImportWarehouseSources` remains the single command intent and consults the
authority policy:

- graph-draft mode updates the graph aggregate and its generated file
  projection;
- dbt-project-files mode updates authoritative dbt YAML through atomic
  workspace-file mutation and then refreshes the analyzer projection;
- it never writes both semantic authorities.

Project validation keeps generated dbt output separate from installed package
dependencies. `target-path` and `log-path` are excluded from isolated analysis;
materialized `packages-install-path` content is excluded from imported source
but retained in the analysis snapshot because `dbt parse` executes package
macros, tests, and models. Source import limits and bounded filesystem traversal
therefore use separate counters. Generated and dependency paths must not overlap
or shadow configured source paths; ambiguous partitions fail closed.

## Preview And Run

In graph-draft mode, preview may generate workspace artifacts from the graph.
In dbt-project-files mode, preview must not regenerate or normalize project
files. It consumes `DbtProjectGraphProjection` and records project root,
project revision, and analysis hash. Runtime bundle construction must use that
same identity.

`profiles.yml`, credentials, resolved secrets, build output, and editor-private
layout are excluded from project bundles and exports. Execution target
selection remains a separate policy/reference boundary.

## Consequences

Positive:

- every Canvas has one semantic authority;
- imported dbt files can be byte-preserved outside direct edits;
- unsupported dbt constructs can remain code-only without destructive
  normalization;
- existing save, preview, readiness, and run rails are reused;
- analyzer and UI concerns remain separated by a query port.

Costs:

- file revision/CAS and batch mutation are prerequisites;
- a server-side dbt analyzer adapter and projection store are required;
- adoption needs parity and failure tests;
- `WorkspaceGraphAuthoringDraft.v1` cannot represent file-backed Canvas state.

## Validation

Each implementation phase must prove:

- no Canvas has two active semantic authorities;
- file-backed preview does not call `GenerateDbtWorkspaceArtifacts`;
- stale file writes fail without changing content;
- Code edits reach the working tree through the existing conditional command
  without a user-facing Save action;
- working-tree synchronization never claims that content is staged, committed,
  pushed, or remotely synchronized;
- analyzer failure preserves files and authority mode;
- Source Import writes only the active authority;
- runtime bundle revision equals preview revision;
- `profiles.yml` and secrets are absent from bundles and exports;
- command/query catalogs contain no save, readiness, or run synonyms.

## Governing Sources

- `docs/architecture/command-query-rail-governance.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/adr/ADR-0058-warehouse-source-import-rails.md`
- `docs/adr/ADR-0059-canonical-node-identity.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`
