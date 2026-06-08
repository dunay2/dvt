---
title: Contracts Workspace Gap Report Source Extension
status: Draft
owner: Architecture / Contracts
workspace: '@dvt/contracts'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: buzon/20260607-contracts-workspace-gap-report.md
---

# Contracts Workspace Gap Report Source Extension

## Purpose

This extension refines the contracts report against contract source files. The
first report correctly identified publication and coverage gaps, but the source
shows stronger implemented contract substance than the first wording implied.

## Sources checked

- `packages/@dvt/contracts/package.json`
- `packages/@dvt/contracts/src/index.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
- `packages/@dvt/contracts/test/schema-sync.test.ts`
- `docs/planning/status/generated-capability-coverage.md`
- root `package.json` contract scripts

## Source-backed findings

### 1. `ExecutionPlan.v1` is materially generic already

`ExecutionPlan.v1.ts` is not dbt-only. It defines:

- `GENERIC_GRAPH_SOURCE_KIND = 'generic-graph-v1'`;
- `GenericGraphNodeV1` with `nodeId`, `stepKind`, `dependsOn`, optional
  `stepTypeConfig`, and metadata;
- `GenericGraphSourceV1` with `sourceFamily`, `sourceVersion`, and nodes;
- `PlannerInputEnvelopeV1` where `graphSource` is canonical ingress;
- `PlanOwnership` for tenant/project/environment scope;
- `ExecutionStepV1` with arbitrary `kind` and `stepTypeConfig`.

**Correction to prior report**

The gap is not that contracts lack generic workflow support. The gap is that
generic workflow support is not yet proven across planner, verifier, interpreter,
adapters, and web for DVT source/transform/sink node kinds.

### 2. `ExecutionPlan.v1` references `specs/contracts`, but publication appears inconsistent

The source comments reference:

- `specs/contracts/engine/ExecutionPlan.v1.md`
- `specs/contracts/engine/ExecutionPlan.v1.schema.json`

The generated capability coverage still reports `contracts specs exist` as `no`.
Therefore the issue is likely one of these:

1. the spec files are missing;
2. the generator/checker looks for a different path;
3. specs exist historically but are not included in the current generated signal;
4. generated capability coverage is stale.

**Correction to prior report**

Do not claim no normative spec was ever intended. The source explicitly intends
one. The actionable gap is to reconcile actual files, generated coverage logic,
and root contract scripts.

### 3. `WorkspaceGraphAuthoringDraft` is a strong graph-first aggregate contract

`WorkspaceGraphAuthoringDraft.v1.ts` declares that the editable draft is
persisted as a graph-first aggregate, not UI widget state. It owns visible nodes,
positions, semantic nodes, semantic edges, and optional multi-canvas workspaces.

It validates:

- unique `nodeIds`;
- `nodePositions` exactly matching visible nodes;
- semantic nodes unique;
- visible nodes reference semantic nodes;
- edges unique;
- edges reference declared semantic node IDs;
- canvases non-empty when declared;
- canvas IDs unique;
- active canvas exists;
- top-level canvas mirrors active canvas workspace identity;
- top-level graph mirrors active canvas graph.

**Correction to prior report**

The product-flow gap is not caused by absence of a graph draft contract. The graph
draft contract is a strength. The gap is mapping concrete DVT node configuration
(source/table/sql/sink policy) into this aggregate and then through planner input.

### 4. Schema sync coverage is narrow but real

`schema-sync.test.ts` validates JSON schema vs Zod for planner policy and planner
input envelope. It includes valid and invalid fixtures, including rejection of
legacy `manifestRef`, `manifest`, and `nodes` forms.

**Correction**

The report should say schema sync exists but is incomplete by family, not absent.

## Refined gaps

### C-01R — Reconcile spec publication with source references

**Evidence**

`ExecutionPlan.v1.ts` references normative prose and JSON schema under
`specs/contracts/engine`, while generated capability coverage says contract specs
are missing.

**Action**

Run or inspect:

```bash
pnpm contracts:index:generate
pnpm contracts:index:check
pnpm docs:capability:generate
```

Then fix one of:

- missing spec files;
- stale generator path;
- stale generated capability report;
- mismatched expected location.

### C-02R — Generate family-level public contract matrix

`src/index.ts` is too broad for manual review. Generate a matrix grouped by:

- engine runtime;
- run state vocabulary;
- planner execution plan;
- workspace graph authoring;
- workspace graph draft persistence;
- transformation flow design/compiler;
- policy vocabulary;
- step type configs;
- errors/validation helpers.

### C-03R — Prove DVT source/transform/sink through contract chain

Contracts support generic graph source and arbitrary step kinds. They do not, by
themselves, prove DVT authoring closure.

**Action**

Add fixtures for:

- `CANVAS_SOURCE`;
- `CANVAS_TRANSFORM`;
- `CANVAS_SINK`;
- invalid source config;
- invalid transform config;
- invalid sink config;
- missing sink;
- disconnected graph;
- cross-canvas active graph mismatch.

### C-04R — Expand schema sync by contract family

Add schema sync tests for:

- `ExecutionPlan.v1`;
- `WorkspaceGraphAuthoringDraft.v1`;
- `WorkspaceGraphAuthoringCommand.v1`;
- `WorkspaceGraphDraft.v1`;
- `TransformationFlowDesignGraph.v1`;
- `TransformationFlowCompiler.v1`;
- `RunStateVocabulary.v1`;
- `StartRunBoundary.v1`.

### C-05R — Decide where DVT node config contracts live

The graph draft node metadata is generic `Record<string, unknown>`. That is
appropriate for an aggregate core, but DVT source/transform/sink product closure
needs typed contracts elsewhere.

**Action**

Introduce typed config contracts by node kind or step kind, then bind them to:

- web node editor;
- planner graph source;
- plan verifier step config;
- adapter capability registry.

## Revised conclusion

`@dvt/contracts` is stronger than the first report suggested. The real gap is not
contract absence. The real gap is **publication, generated traceability, fixture
coverage, and vertical proof across product-specific node kinds**.
