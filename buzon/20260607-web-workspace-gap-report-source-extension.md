---
title: Web Workspace Gap Report Source Extension
status: Draft
owner: Architecture / Web
workspace: '@dvt/web'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: buzon/20260607-web-workspace-gap-report.md
---

# Web Workspace Gap Report Source Extension

## Purpose

This extension checks the web report against `apps/web` source. The original
report correctly identified product-closure gaps, but this source pass separates
what is already implemented from what remains preview/local/gap-needed.

## Sources checked

- `apps/web/package.json`
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

## Source-backed findings

### 1. Web route/plugin architecture is real and guarded

`routes.ts` builds routes from plugin contributions, protects authenticated
routes with `AuthRouteGate`, creates a plugin availability guard, and adds static
shell routes for Plugins and Admin. This is not a hardcoded demo router.

`registry.ts` states the intended authority clearly: plugin projection is
server-projected and fails closed when backend capability rows are absent. It
exposes helpers for route views, shell navigation, canvas tabs, source import
contributions, command palette, overlays, inspectors, renderers, node kinds,
canvas kinds, connection rules, and ports.

**Correction to prior report**

The web workspace should not be described as lacking architecture. Its shell and
plugin contribution model are materially implemented. The gap is capability
closure for key product rails.

### 2. DVT authoring has concrete node kinds and connection rules

`dvtContributions.ts` registers a transformation canvas and connection rules:

```text
dvt:source -> dvt:sql_transform allowed
dvt:sql_transform -> dvt:sink allowed
dvt:sink -> * denied
* -> * denied
```

`dvtNodeTypeCatalog.ts` defines source, SQL transform, and sink authoring node
kinds with input/transform/output roles and preview step kinds:

- `CANVAS_SOURCE`
- `CANVAS_TRANSFORM`
- `CANVAS_SINK`

**Correction to prior report**

The web already has the visible graph-authoring primitives. The missing part is
not “add node types”; it is typed configuration and end-to-end proof that these
node kinds become a valid executable plan.

### 3. Canvas toolbar is intentionally passive

`CanvasToolbar.tsx` describes itself as a passive shell command surface. It
receives handlers rather than owning command semantics. It renders view-menu
controls, primary controls, plan/run readiness, and draft status.

`CanvasToolbarPrimaryControls.tsx` exposes the actual visible commands:

- insert authoring node;
- project snapshot export;
- project snapshot import;
- plan;
- run.

**Correction**

Do not push domain semantics into toolbar components. The right gap is command
rail binding and readiness source, not toolbar refactor.

### 4. `ObservePlanRunReadiness` exists locally, but authoritative readiness is still missing

`canvasPlanReadiness.ts` publishes a local read model with rail name
`ObservePlanRunReadiness`. It tracks plan integrity, backpressure, capability
mismatch, adapter degraded, and authorization blockers.

The frontend rail inventory still marks `ValidateCanvasExecutionReadiness` as
`gap-needed`.

**Correction**

There is already a local readiness model. The missing query is an authoritative
readiness rail that ties local graph validation, persisted preview proof,
permissions, runtime capability, and adapter capacity into one server-readable
or contract-owned response.

### 5. Command/query inventory is already mature and should drive the web roadmap

The frontend C&Q inventory names concrete gaps:

- `CreateWarehouseConnection`;
- `TestWarehouseConnection`;
- `SaveCodeWorkspaceFileBuffer`;
- `ValidateCanvasExecutionReadiness`;
- `CancelRun`;
- `RecoverRun`;
- `OpenRunSourceCanvas`;
- `UpdateNodeCodeProjection`;
- `ListNodeExecutionEvidence`.

**Correction**

The web report should stop saying “identify gaps” generically. The gaps are
already named. The next step is implementing a vertical slice and proving it.

## Refined web gaps

### W-01R — Typed node configuration is missing

Source, SQL transform, and sink nodes exist, but `supportsColumns: false` and the
node catalog does not expose typed product configuration.

**Action**

Define typed config and editors for:

- source: connection/table/schema/columns;
- SQL transform: SQL body or code reference, input aliases, output contract;
- sink: target object, materialization mode, overwrite/incremental policy.

### W-02R — Readiness must graduate from local model to governed rail

`ObservePlanRunReadiness` is useful but local. `ValidateCanvasExecutionReadiness`
should become a governed query that can be tested independently.

**Action**

Create query response shape with blockers:

- missing source;
- missing transform;
- missing sink;
- invalid edge;
- disconnected graph;
- missing connection;
- missing selected table;
- invalid SQL;
- unsupported step kind;
- adapter unavailable;
- authorization denied.

### W-03R — Connection creation/test blocks first-time use

Existing connection listing/import is not enough for a new user. The rail
inventory already names `CreateWarehouseConnection` and `TestWarehouseConnection`.

**Action**

Prioritize `TestWarehouseConnection` before `CreateWarehouseConnection` if seeded
connections remain acceptable for the first proof. Then add creation with server-
side secrets handling.

### W-04R — Run operation loop needs frontend commands

The web can start a run, list runs, get status, and events. But cancel/recover and
source canvas navigation remain gaps.

**Action**

Implement order:

1. `CancelRun` frontend command;
2. `OpenRunSourceCanvas`;
3. `ListNodeExecutionEvidence`;
4. `RecoverRun`.

### W-05R — Code/canvas parity remains unresolved

The rail inventory says backend file save exists, but the Code route buffer is
route-local and save is not product closed.

**Action**

Implement `SaveCodeWorkspaceFileBuffer` and then `UpdateNodeCodeProjection`.

## Revised web conclusion

`@dvt/web` is architecturally more mature than the first report implied. The
correct priority is not shell/component cleanup; it is **closing the DVT vertical
workflow with typed node config, authoritative readiness, connection test/create,
run control, and code/canvas parity**.
