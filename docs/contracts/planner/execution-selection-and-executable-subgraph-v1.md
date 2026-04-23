---
title: Execution selection and executable subgraph v1
status: Active
owner: docs
last_reviewed: 2026-04-23
---

# Execution selection and executable subgraph v1

## Purpose

`TF-A2-C1` freezes the shared boundary for preview/run intent over editable
workspace authoring drafts.

This document exists so `web`, `api`, and later planner derivation slices use
one canonical operator-intent contract and one canonical selected-closure read
model instead of drifting back to whole-draft compile assumptions.

## Normative sources

- `packages/@dvt/contracts/src/contracts/planner/ExecutionSelection.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutableSubgraph.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/index.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/validation.ts`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`

## Selection contract

`ExecutionSelection` expresses operator intent only.

It carries:

- `mode`
- `nodeIds`

It does not carry:

- scope
- capability
- compare-and-swap or idempotency fields
- audit fields
- runtime admission fields
- editable draft payloads

The closed mode vocabulary is:

- `explicit`
- `upstream`
- `downstream`
- `connected_component`

## Selection invariants

- `nodeIds` must be non-empty
- `nodeIds` must be unique
- mode must come from the governed vocabulary
- extra envelope fields fail closed at validation time

## Derived selected-closure contract

`ExecutableSubgraph` is the planner-facing derived read model produced from:

- `WorkspaceGraphAuthoringDraft`
- `ExecutionSelection`

It carries:

- `selection`
- `nodeIds`
- `edgeIds`
- `executable`
- `diagnostics`

It is not a second persisted draft family.

## Executable-subgraph invariants

- `selection` must satisfy the canonical `ExecutionSelection` contract
- `nodeIds` must be unique
- `edgeIds` must be unique
- executable closures must have at least one node id
- executable closures must not carry diagnostics
- non-executable closures must carry one or more diagnostics

## Diagnostic taxonomy

- `selected_node_missing`
- `dependency_gap`
- `cycle_detected`
- `unsupported_selection_mode`

## Ownership rule

- `@dvt/contracts` owns the public shape and validation rules
- planner owns closure derivation and executability evaluation
- `api` owns auth, capability, and protected boundary behavior
- `web` owns user-command production, not planner-local diagnostics logic

## Consumer rule

- preview/run callers must send canonical `ExecutionSelection`
- planner-facing selection results must be expressed as canonical
  `ExecutableSubgraph`
- API preview and planner-backed start-run must resolve selected closure from
  protected draft truth before planner build
- callers must not silently widen from selected scope to whole-draft scope
- invalid selections fail closed with explicit diagnostics

## Related

- [Planner contracts index](./index.md)
- [Workspace graph draft persistence v1](./workspace-graph-draft-persistence-v1.md)
- [Execution selection component](../../architecture/components/planner/execution-selection-component.md)
- [Executable subgraph derivation component](../../architecture/components/planner/executable-subgraph-derivation-component.md)
- [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
