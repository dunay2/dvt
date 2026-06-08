---
title: Product Flow Closure Source Gap Report Extension
status: Draft
owner: Product Architecture / Web API Runtime
workspace_group:
  - '@dvt/web'
  - dvt-api
  - '@dvt/contracts'
  - '@dvt/dsl'
  - '@dvt/planner'
  - '@dvt/plan-verifier'
  - '@dvt/plan-interpreter'
  - '@dvt/engine'
  - '@dvt/adapter-temporal'
  - '@dvt/adapter-postgres'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: docs/planning/reviews/architecture-and-governance/20260607-product-flow-closure-source-gap-report.md
---

# Product Flow Closure Source Gap Report Extension

## Purpose

This extension verifies the product-flow report against source and distinguishes
three different things that must not be conflated:

1. visible UI capability;
2. backend/API rail availability;
3. product-closed workflow behavior.

The source shows DVT is not a blank shell. It also shows why the product flow is
not closed yet.

## Sources checked

- `apps/web/src/app/plugins/registry.ts`
- `apps/web/src/app/plugins/dvt/dvtContributions.ts`
- `apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts`
- `apps/web/src/app/views/canvas/CanvasToolbar.tsx`
- `apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx`
- `apps/web/src/app/views/canvas/canvasPlanReadiness.ts`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/src/application/ports/protectedRuntimeCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeRunCommandQueryRails.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/plan-verifier/src/stepTypeConfig.ts`
- `packages/@dvt/plan-interpreter/src/dagAnalyzer.ts`

## Source-backed corrections

### 1. Source-to-run is partially wired, not absent

Source shows the following pieces are present:

- Web plugin system with server-projected availability.
- DVT canvas kind and DVT node kinds: source, SQL transform, sink.
- Canvas command surface for insert, snapshot import/export, plan, run.
- Local readiness read model: `ObservePlanRunReadiness`.
- API route constants for preview/import/compile, start run, run list/status/events,
  cancel, recover, workspace graph draft, warehouse source import, files.
- API protected runtime rail catalog with negative coverage references.
- Contracts for generic graph source and workspace graph authoring draft.
- Planner deterministic build pipeline.
- Verifier stepTypeConfig validation.
- Interpreter DAG validation/layering.

**Correction**

The flow is not missing all foundations. The missing part is one verified vertical
proof and a few concrete product rails.

### 2. DVT node kinds are visual/authoring primitives, not full semantic configs

`dvtNodeTypeCatalog.ts` proves source/transform/sink nodes exist. However,
source checks show these registrations are role and preview-step oriented. They
do not yet provide typed config depth for connection, table, selected columns,
SQL body, aliases, output contract, or sink materialization policy.

**Refined gap**

The missing part is not node presence; it is node semantics and config contracts.

### 3. Readiness exists locally but is not authoritative enough

`canvasPlanReadiness.ts` defines blockers for plan integrity, backpressure,
capability mismatch, adapter degraded, and authorization denied. This is useful.

But the frontend command/query rail inventory still names
`ValidateCanvasExecutionReadiness` as `gap-needed` because a mature workflow must
name source, transform, sink, scope, artifact, and permission problems before
preview.

**Refined gap**

Keep `ObservePlanRunReadiness` as local/presentation read model. Add
`ValidateCanvasExecutionReadiness` as governed rail.

### 4. Backend is stronger than the product gap suggests

API has route constants and protected runtime rails for:

- existing warehouse connection listing;
- table listing;
- source import;
- preview/import/compile plan;
- start run;
- cancel/recover;
- run reads/events;
- workspace file save.

**Correction**

Several product gaps are frontend/vertical-flow gaps, not backend absence:

- cancel/recover backend exists but frontend commands are missing;
- workspace file save backend exists but Code route save command is missing;
- warehouse source import exists but create/test connection is missing;
- readiness has local derivation but not governed validation rail.

## Refined product closure backlog

### PF-01R — Build one seeded-connection vertical proof first

Do not block the whole vertical proof on connection creation. Use an existing
server-known connection and prove:

```text
DVT source -> SQL transform -> sink -> readiness -> preview -> persisted PlanRef -> start run -> run events -> back to source canvas
```

Mark connection creation as separate first-time-user gap.

### PF-02R — Add typed DVT node configs

Define typed configs for:

- `dvt:source`: connection, schema, table, columns, source options;
- `dvt:sql_transform`: SQL, input aliases, output contract;
- `dvt:sink`: target, materialization, write policy.

Bind configs to contracts, planner graph source, verifier, and UI editor.

### PF-03R — Add governed readiness query

Implement `ValidateCanvasExecutionReadiness` using existing local validation,
contract parsing, plan-verifier checks, runtime capability registry, and
workspace scope authorization.

### PF-04R — Close operational run loop

Implement frontend ports/actions for existing backend capabilities:

- `CancelRun`;
- `OpenRunSourceCanvas`;
- `ListNodeExecutionEvidence`;
- `RecoverRun` later, after failure UX is stable.

### PF-05R — Close code/canvas parity

Implement `SaveCodeWorkspaceFileBuffer` using existing workspace file save rail,
then implement `UpdateNodeCodeProjection` so code edits and graph node metadata do
not diverge.

### PF-06R — Add connection test/create after seeded proof

Add `TestWarehouseConnection` before `CreateWarehouseConnection`. Testing a
server-known or newly entered connection should be server-owned and never mocked
by the browser.

## Revised vertical proof acceptance criteria

A product proof is acceptable only when it verifies:

1. UI creates or loads a graph draft using DVT node kinds.
2. The graph has source, transform, sink and valid edges.
3. Readiness returns either `ready` or machine-readable blockers.
4. Preview produces and persists a PlanRef.
5. StartRun uses the persisted PlanRef or a valid planner-backed command.
6. Backend generates platform run ID.
7. Run detail shows status and events.
8. Evidence links back to graph nodes or explicitly reports missing node evidence
   as a known gap.

## Closeout

The product-flow gap is narrower and more actionable than a generic “workflow is
missing” claim. The code has a real skeleton. The next work should prove a seeded
vertical flow and then close first-time source connection, readiness, run control,
evidence, and code/canvas parity.
