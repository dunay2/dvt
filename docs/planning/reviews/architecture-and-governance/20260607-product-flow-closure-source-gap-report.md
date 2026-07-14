---
title: Product Flow Closure Source Gap Report
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
---

# Product Flow Closure Source Gap Report

## Purpose

This report answers the product question directly:

> Can a user create a real DVT workflow from a source, configure operations, validate it, preview/compile/import a plan, run it, and inspect evidence?

The source answer is: **partially, but not product-closed**. The UI, API, planner,
engine, adapters, and workers are real. The missing part is a governed end-to-end
closure contract and several specific command/query gaps.

## Sources inspected

- `apps/web/src/app/routes.ts`
- `apps/web/src/app/plugins/registry.ts`
- `apps/web/src/app/plugins/dvt/dvtContributions.ts`
- `apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts`
- `apps/web/src/app/views/canvas/CanvasToolbar.tsx`
- `apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx`
- `apps/web/src/app/views/canvas/canvasPlanReadiness.ts`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/startRunRouteParser.ts`
- `apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts`
- core/runtime reports created in this branch

## Current source facts

### Web route and plugin projection

`routes.ts` creates plugin routes from `getRouteViews()`, protects shell routes
with `AuthRouteGate`, creates plugin availability guards, adds a canvas workbench
tab route, and exposes static shell routes for `plugins` and `admin`.

`registry.ts` states the browser plugin projection is server-projected by
runtime capabilities and fails closed when backend capability rows are absent.
The static registry includes `dbt`, `dvt.warehouse-source`, `dvt`, `monitoring`,
and `cost` contributions.

### DVT authoring plugin

`dvtContributions.ts` defines the DVT plugin with capabilities:

- `canvas.render`
- `canvas.edit`
- `plan.preview`

It registers a transformation canvas with preview profile
`transformation-sql-first-v1`. It declares connection rules:

```text
dvt:source -> dvt:sql_transform allowed
dvt:sql_transform -> dvt:sink allowed
dvt:sink -> * denied
* -> * denied
```

`dvtNodeTypeCatalog.ts` declares three authoring node kinds:

- `dvt:source` / role `input` / preview step kind `CANVAS_SOURCE`
- `dvt:sql_transform` / role `transform` / preview step kind `CANVAS_TRANSFORM`
- `dvt:sink` / role `output` / preview step kind `CANVAS_SINK`

All three currently have `supportsColumns: false`.

### Canvas command surface

`CanvasToolbar.tsx` is explicitly a passive shell command surface. It receives
handlers for auto-layout, overlays, grid, import/export snapshot, reload latest
draft, plan, run, and create authoring node. It renders primary controls and a
`PlanRunReadinessPanel`.

`CanvasToolbarPrimaryControls.tsx` exposes visible commands:

- insert authoring node;
- export project snapshot;
- import project snapshot;
- plan;
- run.

The plan button is disabled when `!canPlan || !canPlanGraph`; the run button is
disabled when `!canRun || !canStartRun`.

### Plan/run readiness

`canvasPlanReadiness.ts` publishes `ObservePlanRunReadiness` as read model. It
tracks blockers:

- `plan_integrity`
- `backpressure`
- `capability_mismatch`
- `adapter_degraded`
- `authorization_denied`

Readiness depends on persisted preview proof, planRef, plan identity alignment,
staleness, authorization, and optional runtime capacity/capability signals.

### API start-run path

`startRunRoute.ts` composes parser, bearer extraction, authorization facade,
platform run ID generation, and HTTP response translation.

`startRunRouteParser.ts` parses body, scope, and command, then assigns action
`AUTHORIZATION_ACTION.runStart` using the tenant/project/environment scope.

`startRunRouteCommandBuilder.ts` rejects caller-provided `runId`, generates a
platform run id matching `run_<UUIDv7>`, validates target adapter, evaluates
plan-source policy, and supports two command branches:

- `planRef` backed start run;
- planner-backed start run.

## Product flow closure matrix

| Step                             | Current source posture                                                                                                     | Gap                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Choose/create workspace scope    | `SelectWorkspaceScope` exists as implemented-local rail over server-granted workspaces                                     | Needs explicit product flow proof that all protected requests use selected scope and fail closed before scope resolution.  |
| Create/test warehouse connection | Rail inventory marks `CreateWarehouseConnection` and `TestWarehouseConnection` as `gap-needed`                             | User cannot create/authenticate a new source from the UI. Existing server-known connections can be listed/imported.        |
| Select/import source tables      | `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, and `ImportWarehouseSources` are implemented-api rails | Needs end-to-end proof from source import to canvas source node and generated graph draft.                                 |
| Create authoring nodes           | DVT plugin exposes `dvt:source`, `dvt:sql_transform`, `dvt:sink`; toolbar has insert command                               | Node kinds have `supportsColumns: false`; node configuration depth is not enough for real source/transform/sink semantics. |
| Connect nodes                    | DVT plugin enforces source -> transform -> sink connection rules                                                           | Needs validation proof that graph semantics match planner/verifier expectations.                                           |
| Validate readiness               | `ObservePlanRunReadiness` exists locally; `ValidateCanvasExecutionReadiness` is `gap-needed`                               | Readiness remains derived locally and via preview rejection; needs server-readable readiness query.                        |
| Preview plan                     | `PreviewExecutablePlan` is `implemented-api`; Canvas toolbar has plan command                                              | Needs proof that DVT source/transform/sink graph compiles to generic non-dbt executable plan, not just preview UI.         |
| Start run                        | `StartRun` is implemented-api; API rejects client run IDs and generates platform run ID                                    | Needs UI path proof from persisted preview PlanRef to start-run response and run list/detail navigation.                   |
| Inspect run                      | `ListRuns`, `GetRunStatus`, `GetRunEvents` implemented-api                                                                 | Needs `OpenRunSourceCanvas` and `ListNodeExecutionEvidence` to connect run evidence back to graph nodes.                   |
| Control run                      | Backend cancel/recover routes exist in rail inventory, frontend `CancelRun` and `RecoverRun` are gap-needed                | User cannot perform governed cancel/recover from frontend as product command.                                              |
| Edit code/node projection        | `SaveWorkspaceFileContent` exists but `SaveCodeWorkspaceFileBuffer` and `UpdateNodeCodeProjection` are gap-needed          | Code/canvas parity is incomplete.                                                                                          |

## Critical gaps

### PF-01 — Source connection creation and test are not product-closed

The current frontend can list known warehouse connections and import sources, but
cannot create or test a warehouse connection. This blocks the first-time user
path.

**Action**

Implement `CreateWarehouseConnection` and `TestWarehouseConnection` rails with:

- server-owned secret handling;
- credential validation;
- duplicate connection detection;
- tenant authorization;
- audit logging;
- no secret echo in response;
- frontend fail-closed states.

### PF-02 — Canvas readiness is local/projection-heavy

`ObservePlanRunReadiness` is useful, but `ValidateCanvasExecutionReadiness` is
still a gap. The system needs one authoritative readiness query naming missing
source, transform, sink, scope, artifact, permission, capability, and adapter
problems.

**Action**

Create `ValidateCanvasExecutionReadiness` as a query rail backed by contracts/API
or governance projection, then make toolbar run/plan disabled reasons consume it.

### PF-03 — DVT authoring nodes are too thin

The DVT plugin exposes source, SQL transform, and sink node kinds, but they are
mostly visual/role-level authoring kinds. `supportsColumns: false` across all
three is a concrete signal that field-level authoring and mapping are not yet
product-closed.

**Action**

Add node configuration contracts:

- source: connection, schema/table, selected columns, freshness/tests options;
- SQL transform: SQL body/ref, input aliases, output contract;
- sink: materialization target, table/view policy, overwrite/incremental policy.

### PF-04 — Generic DVT plan proof is missing

Planner defaults still show dbt-first behavior in the core report. The DVT plugin
uses preview step kinds `CANVAS_SOURCE`, `CANVAS_TRANSFORM`, and `CANVAS_SINK`.
The missing proof is that those step kinds travel through contracts, planner,
verifier, interpreter, and runtime adapter capability checks.

**Action**

Create a golden generic DVT flow fixture:

```text
dvt:source -> dvt:sql_transform -> dvt:sink
```

It must prove:

- graph draft serialization;
- planner envelope;
- execution plan;
- stepTypeConfig validation;
- interpreter layers;
- adapter capability support or explicit unsupported diagnostic;
- plan preview persistence;
- start-run admission.

### PF-05 — Run control and evidence loop are incomplete

Frontend rail inventory marks `CancelRun`, `RecoverRun`, `OpenRunSourceCanvas`,
and `ListNodeExecutionEvidence` as needed but not implemented. This prevents
real operational iteration from the UI.

**Action**

Implement in this order:

1. `CancelRun` frontend port/action over backend cancel route.
2. `OpenRunSourceCanvas` using run context / plan provenance.
3. `ListNodeExecutionEvidence` by node id and run id.
4. `RecoverRun` after failure semantics are product-approved.

### PF-06 — Code/canvas parity is incomplete

The backend can save workspace file content, but the Code route save command and
node-code projection update are gaps.

**Action**

Implement `SaveCodeWorkspaceFileBuffer` first, then `UpdateNodeCodeProjection`.
Do not let Monaco-local edits become a second source of truth.

## Proposed E2E proof sequence

Create one Cypress-backed and API-backed vertical proof:

1. Start authenticated shell.
2. Select existing workspace scope.
3. Use existing server-known warehouse connection.
4. Import one source table.
5. Create `dvt:source`, `dvt:sql_transform`, `dvt:sink` nodes.
6. Connect source -> transform -> sink.
7. Run readiness query and assert ready or explain exact blocker.
8. Preview plan and persist PlanRef.
9. Start run.
10. Navigate to run detail.
11. Show run events.
12. Return to source canvas from run evidence.

If connection creation is not implemented yet, the proof starts from a seeded
connection and explicitly marks first-time connection as not closed.

## Fowler/DDD diagnosis

### Smells

- **Illusory completeness**: Canvas has buttons and nodes, but first-time source
  connection and readiness are not product-closed.
- **Parallel source of truth**: local readiness, preview rejection, API admission,
  planner verification, and adapter capability can each explain failure
  differently.
- **Feature envy in UI**: node kinds and toolbar actions can start encoding domain
  semantics unless backed by contracts and rails.
- **Temporal coupling**: preview PlanRef persistence must align with start-run;
  otherwise stale preview identity blocks execution.

### Boundary rule

The browser may present and collect intent. It must not certify execution
readiness, fake plugin capability, fake warehouse connection success, or assign
run identity.

## Recommended remediation order

1. Implement/generate `ValidateCanvasExecutionReadiness` query.
2. Create generic DVT golden flow fixture using seeded connection.
3. Close `CancelRun` frontend action.
4. Close `OpenRunSourceCanvas` and `ListNodeExecutionEvidence`.
5. Implement `SaveCodeWorkspaceFileBuffer`.
6. Add source node configuration contract and table/column support.
7. Add `TestWarehouseConnection` and `CreateWarehouseConnection`.
8. Add `UpdateNodeCodeProjection`.
9. Add `RecoverRun` after failure/recovery UX is stable.

## Validation baseline for future implementation

```bash
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web lint
pnpm --filter @dvt/web test:ci
pnpm --filter @dvt/web test:changed
pnpm --filter dvt-api typecheck
pnpm --filter dvt-api test
pnpm --filter @dvt/contracts test
pnpm --filter @dvt/planner test
pnpm --filter @dvt/plan-verifier test
pnpm --filter @dvt/plan-interpreter test
pnpm --filter @dvt/engine test
pnpm verify:prepush
```

## Closeout

DVT is closer than a blank prototype: it has plugin-projected UI, DVT node kinds,
connection rules, plan/run toolbar controls, readiness read model, API start-run
hardening, platform-owned run IDs, planner/verifier/interpreter pieces, and
runtime adapters. The missing work is to close the vertical product proof and
remove local/preview-only gaps from the first real workflow.
