---
title: Transformation flow preview and design graph v1
status: Active
owner: docs
last_reviewed: 2026-04-14
---

# Transformation flow preview and design graph v1

## Purpose

`TF-A1-A` freezes the first SQL-first design-graph contract and the caller-visible
preview-persist boundary consumed by `web`, `api`, and downstream planner work.

This document is the repo-local reader for the shared contracts now published
from `@dvt/contracts`.

## Normative sources

- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowDesignGraph.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/validation.ts`

## Design graph contract

`DesignGraphDraft` is the governed authoring artifact for the first vertical.

The only valid v1 node vocabulary is:

- `source`
- `sql_transform`
- `sink`

The governed graph invariants are:

1. exactly one source node
2. exactly one sql transform node
3. exactly one sink node
4. exactly two edges
5. edges must be `source -> sql_transform -> sink`
6. edges must reference known node ids
7. node ids and edges must be unique
8. `executionTarget` is `postgres`
9. transform payloads use `dialect: postgres`
10. the draft artifact itself does not carry a self-referential `graphArtifact`

## Provenance contract

`GitArtifactRef` is the shared Git-first provenance envelope used by preview
requests and by the design-graph draft payload for SQL artifacts.

For the SQL-first preview profile, request-side provenance is explicit and
caller-visible:

- `provenance.graphArtifact`
- `provenance.sqlArtifact`

## Preview request

`PlanPreviewRequest` freezes the caller-visible request contract for
`POST /plans/preview`.

For `transformation-sql-first-v1`:

- `previewProfile` is explicit and required
- `persist` is always `true`
- `selectedNodeIds` is non-empty and duplicate-free
- `graphSource.sourceFamily` is `transformation-design-graph`
- `graphSource.sourceVersion` is `transformation-sql-first-v1`
- `graphSource` must satisfy the canonical compiler mapping documented in the
  companion compiler contract
- provenance is required

## Preview response

`PlanPreviewPersistResponse` freezes the persisted-preview response envelope.

It always contains:

- `previewProfile`
- `plan`
- `planRef`
- `persisted`
- `validation`

For `transformation-sql-first-v1` it additionally requires:

- `planSummary`
- `provenance`
- `planSummary.executor = postgres`

## Consumer rule

- `web` must consume the shared request and response contracts instead of local
  DTO copies.
- `web` preview and execution orchestration must stay composed through the
  dedicated Canvas seams introduced by `TF-A1-C`, rather than route-local or
  hook-local shadow DTO builders.
- `api` must validate preview provenance against the shared contract instead of
  route-local parsers.
- `api` preview routes must keep using dedicated route-scope, guard, binder,
  and response-mapper helpers instead of inlining the boundary logic again.
- the SQL-first compiler mapping is now frozen in the companion compiler
  contract and must not be redefined in route-local code.

## Related

- [Planner contracts index](./index.md)
- [Transformation flow compiler mapping v1](./TransformationFlowCompiler.v1.md)
- [Transformation flow architecture and contracts](../../planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md)
- [Transformation flow product decisions](../../planning/proposals/mandatory/runtime-and-contracts/transformation-flow-product-decisions-20260405.md)
