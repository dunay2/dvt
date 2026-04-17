---
title: RunPlanWorkflow refactor analysis
status: Archived
owner: Engine / Temporal / Docs
last_reviewed: 2026-04-17
planning_type: archive
superseded_by:
  - docs/planning/reviews/execution-runtime/20260315-run-plan-workflow-architecture-review.md
  - docs/architecture/components/engine/architecture/workflows.md
  - docs/architecture/components/engine/adapters/temporal/EnginePolicies.md
---

# RunPlanWorkflow refactor analysis

This archive digest summarizes a March 2026 refactor note for
`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`.

The original note was useful because it made one architectural boundary
explicit: `RunPlanWorkflow` should remain a deterministic orchestrator around
run execution, not become the domain root or a second source of truth.

## Historical conclusions preserved from the note

- keep Temporal workflow code deterministic and side-effect-thin
- move lifecycle, gateway, and continue-as-new policy into pure collaborators
- avoid growing a shadow in-memory state model beside persisted run facts
- prefer typed lifecycle event builders over a generic event emission surface
- document that workflow query state is operational visibility, not canonical
  persisted truth

## Current repository posture

The historical note proposed a broader workflow-package split, but the current
repository does not implement that target layout as written.

Today the workflow package still centers on:

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`

That means this document is no longer the right source for current file layout
or execution behavior. The authoritative guidance moved into governed runtime
reviews and engine architecture docs.

## Why this note is archived

- It describes a historical refactor direction, not the current package shape.
- More recent review material captures the actual workflow boundary and risks.
- Active engine workflow docs now route readers to the real Temporal adapter
  surface directly.

## Current reader route

- Use
  [20260315 RunPlanWorkflow architecture review](../../reviews/execution-runtime/20260315-run-plan-workflow-architecture-review.md)
  for the detailed architectural review and refactor map.
- Use
  [Engine workflows](../../../architecture/components/engine/architecture/workflows.md)
  for the canonical engine workflow navigation surface.
- Use
  [Engine Policies](../../../architecture/components/engine/adapters/temporal/EnginePolicies.md)
  for the current Temporal adapter policy surface.
