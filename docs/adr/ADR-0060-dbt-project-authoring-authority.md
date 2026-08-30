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
```

The MVP does not support authority transitions or adoption. Once a Canvas is
created as a graph draft or imported as a dbt project, its authority cannot
change. A future transition in either direction requires a separate accepted
decision, command rail, losslessness policy, and atomic mutation boundary.

Authority resolution is exhaustive and fail-closed:

| Graph draft owns the Canvas | File binding exists | Result              |
| --------------------------- | ------------------- | ------------------- |
| yes                         | no                  | `graph-draft`       |
| no                          | yes                 | `dbt-project-files` |
| no                          | no                  | missing authority   |
| yes                         | yes                 | mixed authority     |

Missing and mixed authority are typed refusals. Absence is never interpreted as
an implicit graph-draft default.

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
- `GetWorkspaceGraphDraft`
- `PublishGraphDbtWorkspaceArtifacts`

`SaveDbtProjectFileEdit` and `RunPersistedDbtProject` remain retired synonyms.

The following product intents were admitted for phased implementation:

- `ValidateDbtProjectImport`
- `ImportDbtProject`
- `ProjectDbtGraphFromFiles`

They may be promoted only with a DDD owner, application port, adapter surface,
scope policy, failure vocabulary, and negative tests. A structured visual-edit
command is not accepted by this ADR; it must be introduced only when a concrete
lossless edit operation requires it.

`ExportDbtProject` is retired and is not a distinct product command. File-backed
round-trip reads and writes use `ListWorkspaceFiles`,
`GetWorkspaceFileContent`, and `SaveWorkspaceFileContent`. A future export
intent may be admitted only if it introduces behavior that those rails do not
own and receives a separate accepted command decision with the required port,
scope policy, failure vocabulary, and negative tests.

## Workspace File Safety

File-backed authoring requires the existing workspace-file rails to gain:

- a stable content revision on reads;
- compare-and-swap on writes;
- an explicit stale-write rejection;
- atomic replacement in the local filesystem adapter;
- an atomic batch mutation boundary before import or cross-file edits.

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

`PublishGraphDbtWorkspaceArtifacts` must resolve authority again on the server
before any workspace-file mutation. Only `graph-draft` may publish generated
artifacts. Missing, mixed, and `dbt-project-files` authority fail closed.

The `graph-draft-content-sha256` line in generated model SQL is a divergence
marker. It detects whether generated content changed since the graph projection;
it is not authentication, authorization, a signature, or a trust claim.
Unmarked or mismatched SQL is never adopted or overwritten by an MVP
confirmation path.

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
- `WorkspaceGraphAuthoringDraft.v1` cannot represent file-backed Canvas state.

## Validation

Each implementation phase must prove:

- no Canvas has two active semantic authorities;
- missing and mixed authority fail closed;
- file-backed preview does not call `GenerateDbtWorkspaceArtifacts`;
- file-backed, missing, and mixed authority cannot call
  `PublishGraphDbtWorkspaceArtifacts`;
- unmarked or mismatched SQL cannot be adopted through a confirmation path;
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
