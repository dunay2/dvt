---
title: Transformation flow compiler mapping v1
status: Active
owner: docs
last_reviewed: 2026-04-14
---

# Transformation flow compiler mapping v1

## Purpose

`TF-A1-B` freezes the deterministic compiler mapping for the first SQL-first
transformation vertical, and `TF-A1-C` hardens the implementation into smaller
contracts, registry, API, and web seams without changing those semantics.

The contract keeps one planner ingress story:

- callers submit `graphSource`
- `graphSource` carries the canonical SQL-first step chain and step config
- persisted plans preserve enough governed structure for runtime and preview
  summary consumers to derive the same truth

## Normative sources

- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompilerSummary.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepKinds.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepTypeConfigs.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts`
- `packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/validation.ts`

## Canonical step chain

The only valid SQL-first compiler chain is:

1. `PREPARE_POSTGRES_TRANSFORM`
2. `POSTGRES_SQL_TRANSFORM`
3. `CAPTURE_MATERIALIZATION_EVIDENCE`

The dependency order is fixed:

- `POSTGRES_SQL_TRANSFORM` depends on the prepare node id
- `CAPTURE_MATERIALIZATION_EVIDENCE` depends on the transform node id

## Graph-source invariants

For `sourceFamily = transformation-design-graph` and
`sourceVersion = transformation-sql-first-v1`:

- exactly one prepare node is present
- exactly one transform node is present
- exactly one evidence node is present
- there are exactly three governed nodes
- source and sink binding stay coherent across prepare, transform, and evidence
- `selectedNodeIds` must match the canonical compiler node ids when the preview
  request is validated

## Step config ownership

`PREPARE_POSTGRES_TRANSFORM` owns:

- `targetSchema`
- `sourceSchema`
- `sourceTable`
- `sourceAlias`

`POSTGRES_SQL_TRANSFORM` owns:

- `dialect`
- `entrypoint`
- `sql`
- `sqlArtifact`
- `sourceSchema`
- `sourceTable`
- `sourceAlias`
- `sinkSchema`
- `sinkTable`
- `materialization`
- `writeMode`

`CAPTURE_MATERIALIZATION_EVIDENCE` owns:

- `sinkSchema`
- `sinkTable`
- `materialization`
- `writeMode`

## Persisted plan summary rule

`summarizeTransformationSqlFirstPlan(plan)` is the canonical summary derivation
for the SQL-first preview response.

It requires the persisted plan to preserve:

- the fixed three-step chain
- the prepare-to-transform dependency
- the transform-to-evidence dependency
- the same source table and sink table binding expressed in the compiler config

The canonical summary is:

- `executor = postgres`
- `nodeCount = 3`
- `stepCount = 3`
- one derived source table
- one derived sink table

## Consumer rule

- `web` must emit the canonical step kinds and required `stepTypeConfig`
  fields instead of route-local preview kinds.
- `web` must keep preview graph assembly, provenance, readiness, preview
  planning, and run-start orchestration in the dedicated seams introduced by
  `TF-A1-C`, not regrow a single convenience module.
- `api` must validate the SQL-first preview request through the shared parser
  and derive `planSummary` from the governed persisted plan shape.
- `api` must compose preview-route scope, guard, binder, and response mapping
  through dedicated helpers rather than route-local shadow logic.
- runtime and adapter consumers must keep using the same step-kind vocabulary
  from `@dvt/contracts` rather than redeclaring local aliases.

## Related

- [Planner contracts index](./index.md)
- [Transformation flow preview and design graph v1](./TransformationFlowPreview.v1.md)
- [Transformation flow architecture and contracts](../../planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md)
