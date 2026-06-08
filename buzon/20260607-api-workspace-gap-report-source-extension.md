---
title: API Workspace Gap Report Source Extension
status: Draft
owner: Architecture / API
workspace: dvt-api
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: buzon/20260607-api-workspace-gap-report.md
---

# API Workspace Gap Report Source Extension

## Purpose

This extension corrects and refines the API report after inspecting the API route
and command/query rail sources. The original report said a route-by-route
command/query rail report was missing. Source inspection shows this is not
accurate as stated: the API already has a protected runtime route constants
surface and executable command/query rail catalog.

The real gap is not lack of API rail catalog. The gap is **using that catalog as
an authoritative cross-surface source for frontend/product closure, generated
reports, and remaining product rails**.

## Sources checked

- `apps/api/package.json`
- `apps/api/src/server.ts`
- `apps/api/docs/protected-runtime-route-group-component.md`
- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/src/application/ports/protectedRuntimeCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimePlanCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts`
- `apps/api/src/application/ports/protectedRuntimeRunCommandQueryRails.ts`
- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/startRunRouteParser.ts`
- `apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts`
- `docs/architecture/components/api/api-current-to-target-architecture.md`

## Source-backed findings

### 1. API protected runtime route inventory exists

`runtimeRoutes.constants.ts` defines route paths and a protected runtime summary
for:

- session;
- start run;
- plans compile/preview/import;
- projects list/create;
- workspace context;
- workspace plugins;
- workspace graph draft read/save;
- workspace diff changes;
- warehouse connections/tables/import;
- workspace files/history/content save;
- cost attribution;
- runs list/status/events/signal/cancel/recover.

**Correction to prior report**

The API does not lack a route inventory. It lacks a generated consumer-facing
report that links this route inventory to web/product readiness and remaining
rail gaps.

### 2. API command/query rail catalog exists and is split by concern

`protectedRuntimeCommandQueryRails.ts` composes:

- `PROTECTED_RUNTIME_PLAN_COMMAND_QUERY_RAILS`;
- `PROTECTED_RUNTIME_WORKSPACE_COMMAND_QUERY_RAILS`;
- `PROTECTED_RUNTIME_RUN_COMMAND_QUERY_RAILS`.

The route group component guide says every route in `runtimeRoutes.constants.ts`
has exactly one row in `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`, each required
negative test case has evidence, and new routes require route constants, catalog,
component guide, and architecture coverage in one slice.

**Correction**

Do not ask for a hand-written route-by-route inventory as if none exists. Instead
ask for generated projections from this executable catalog:

- API route matrix;
- frontend rail mapping;
- product gap matrix;
- validation coverage matrix.

### 3. Start-run route is hardened

`startRunRoute.ts` composes parser, bearer extraction, authorization facade,
platform run ID generation, target adapter registry, and response translation.

`startRunRouteParser.ts` parses body, scope, command, and assigns
`AUTHORIZATION_ACTION.runStart` over tenant/project/environment scope.

`startRunRouteCommandBuilder.ts` rejects caller-provided `runId`, generates
platform-owned `run_<UUIDv7>`, validates target adapter, evaluates plan source,
and supports planRef-backed and planner-backed start-run command branches.

**Correction**

The product gap is not start-run route immaturity. The start-run backend route is
strong. The remaining gap is proving the frontend can reliably produce a persisted
PlanRef and run from it, then navigate to run evidence.

### 4. Warehouse source import exists, but create/test connection does not

API workspace rails include:

- list warehouse connections;
- list tables;
- import sources.

The frontend rail inventory still marks create/test connection as gaps. Source
supports the distinction: API has existing connection catalogue/import behavior,
but no route constants for `CreateWarehouseConnection` or `TestWarehouseConnection`.

### 5. Run cancel/recover exist on backend

Run command rails include `cancelRun` and `recoverRun`, with negative coverage.
The gap is frontend consumption and product UX, not backend route absence.

## Refined API gaps

### A-01R — Generate route/rail report from existing source catalog

**Previous wording:** route-by-route command/query rail report missing.

**Corrected wording:** executable route/rail catalog exists; generated external
report is missing.

**Action**

Generate a report from:

- `runtimeRoutes.constants.ts`;
- `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`;
- negative coverage rows;
- tests referenced by `PROTECTED_RUNTIME_TEST_REF`.

Output should include route, method, rail name, kind, bounded context, DDD object,
application port, adapter surface, authorization posture, negative tests, and web
consumer.

### A-02R — Frontend-facing runtime contract should be generated from API rail catalog

The frontend contract should not be separately hand-authored. It should be
projected from route constants, rail catalog, contracts, and frontend port usage.

**Action**

Create a generated `frontend-runtime-contract` source with:

- API rail;
- route;
- request/response contract;
- frontend port/hook;
- auth scope;
- supported error envelope;
- product status.

### A-03R — Product gap: connection creation/test routes absent

API has routes for listing connections/tables and importing sources, but not
creating or testing warehouse connections.

**Action**

Add governed rails before implementation:

- `CreateWarehouseConnection` command;
- `TestWarehouseConnection` query/command-probe.

Both require secret handling, no-secret echo, tenant authorization, audit, and
negative tests.

### A-04R — Product gap: frontend run control consumption

Backend cancel/recover rails exist. Frontend consumption is missing.

**Action**

Implement frontend ports/actions over existing backend rails rather than adding
new API routes.

### A-05R — Admin route posture is already fail-closed/flagged, but needs product split

The route group guide states admin repair routes are registered only when
`DVT_ADMIN_ROUTES_ENABLED` is true. The gap is not simply RBAC wiring; it is
operator UX and product exposure.

**Action**

Document admin routes as operator-only with:

- feature flag;
- RBAC action;
- audit requirement;
- UI exposure rule;
- negative coverage.

### A-06R — Query purity risk remains but should be checked from rail consumers

The route catalog is strong. The remaining CQRS risk is whether route handlers or
use cases call the wrong side of engine/state-store/adapters.

**Action**

Add architecture tests from rail kind:

- query rails cannot call command use cases;
- command rails cannot read directly from projection-only APIs unless explicitly
  allowed;
- route handlers stay adapters and do not import domain services directly except
  through use-case facades.

## Revised API conclusion

`dvt-api` is more mature than the initial report implied. It already has route
constants, route-group docs, executable command/query rail catalogs, negative
coverage references, and a hardened start-run path. The next value is generated
traceability and product closure, not rebuilding an inventory that already exists.
