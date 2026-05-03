---
title: Protected runtime route group component
status: Active
owner: apps/api
last_reviewed: 2026-05-03
---

# Protected runtime route group component

This local guide documents the `apps/api` protected runtime HTTP route group
registered by `registerProtectedRuntimeRoutes.ts`.

It implements the first `AR-C10-A` mechanization step from
`docs/planning/proposals/mandatory/runtime-and-contracts/protected-runtime-rail-closure-plan-20260503.md`.
The route group is an application ingress over existing command/query rails; it
is not a domain model, planner, runtime engine, or authorization backend.

Use these related guides with this page:

- `apps/api/docs/start-run-http-entrypoint-component.md`
- `apps/api/docs/start-run-application-component.md`
- `apps/api/docs/protected-security-access-decision-component.md`
- `apps/api/docs/protected-runtime-dependency-builders-component.md`
- `apps/api/docs/workspace-graph-draft-application-component.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`

## Owned concern

The component owns exactly one concern:

- register the protected runtime HTTP routes and bind each route to one
  DDD-owned command or query rail.

It does **not** own:

- planner semantics,
- engine lifecycle semantics,
- plan-store lifecycle state,
- access-decision backend semantics,
- admin repair policy,
- route-specific parser behavior,
- provider-adapter execution behavior.

## Public API

- `registerProtectedRuntimeRoutes.ts`
  Composition root for protected runtime route registration and route-level
  dependency binding.
- `runtimeRoutes.constants.ts`
  Route path and summary constants that define the protected runtime route
  inventory.
- `registerWorkspaceGraphDraftRoutes(...)`
  Delegated route group for the workspace graph draft read/write boundary.
- `registerAdminRoutes(...)`
  Explicitly enabled admin repair route group.

## Invariants

- Every route in `runtimeRoutes.constants.ts` has exactly one row in the
  command/query rail matrix below.
- Each matrix row names the owning application service or delegated route group.
- Routes remain HTTP adapters; they do not own planner, engine, state-store, or
  access-decision backend semantics.
- `POST /runs/:runId/signal` with `CANCEL` is compatibility behavior.
- `POST /runs/:runId/cancel` is the canonical cancel command route.
- Admin repair routes are registered only when `DVT_ADMIN_ROUTES_ENABLED` is
  true.
- New protected runtime routes require an update to this component guide, the
  route constants, and architecture coverage in the same slice.

## Component map

```mermaid
flowchart LR
  Register["registerProtectedRuntimeRoutes.ts"] --> Plan["Plan routes"]
  Register --> Draft["Workspace draft route group"]
  Register --> Runs["Run route group"]
  Register --> Admin["Admin repair route group"]

  Plan --> Start["POST /runs/start"]
  Plan --> Preview["POST /plans/preview"]
  Plan --> Compile["POST /plans/compile"]
  Plan --> Import["POST /plans/import"]
  Draft --> DraftRead["GET /workspace/graph/draft"]
  Draft --> DraftSave["PUT /workspace/graph/draft"]
  Runs --> RunReads["GET /runs, /runs/:runId, /runs/:runId/events"]
  Runs --> RunCommands["POST /runs/:runId/signal|cancel|recover"]
  Admin --> Repair["POST /admin/runs/:runId/rebuild-snapshot"]
```

## Command/query rail matrix

| Route                                      | Rail    | Bounded context              | Application owner              | Authorization posture                                         | Required negative coverage                                                                 |
| ------------------------------------------ | ------- | ---------------------------- | ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `POST /runs/start`                         | Command | Runtime safety and admission | StartRunAuthorizedFacade       | `run:start`, tenant scope                                     | missing token, missing action, tenant mismatch, client `runId`, invalid plan source        |
| `POST /plans/preview`                      | Command | Planner/runtime admission    | PreviewPlanUseCase             | planner/runtime command scope, tenant scope                   | missing token, missing action, tenant mismatch, invalid graph source, invalid selection    |
| `POST /plans/compile`                      | Query   | Planner boundary             | CompilePlanUseCase             | planner query/action scope, tenant scope                      | missing token, missing action, tenant mismatch, unsupported adapter                        |
| `POST /plans/import`                       | Command | Runtime plan ingestion       | ImportPlanUseCase              | plan import command scope, tenant scope                       | missing token, missing action, tenant mismatch, invalid plan ref                           |
| `GET /workspace/graph/draft`               | Query   | Workspace graph drafting     | getWorkspaceGraphDraftUseCase  | workspace draft read scope                                    | missing token, missing action, tenant/workspace mismatch                                   |
| `PUT /workspace/graph/draft`               | Command | Workspace graph drafting     | saveWorkspaceGraphDraftUseCase | workspace draft save scope                                    | missing token, missing action, tenant/workspace mismatch, stale authority                  |
| `GET /runs`                                | Query   | Runtime read model           | ListRunsUseCase                | `run:list`, tenant scope                                      | missing token, missing action, tenant mismatch                                             |
| `GET /runs/:runId`                         | Query   | Runtime read model           | GetRunStatusUseCase            | `run:view`, tenant scope                                      | missing token, missing action, tenant mismatch, unknown run                                |
| `GET /runs/:runId/events`                  | Query   | Runtime read model           | GetRunEventsUseCase            | `run:logs:view`, tenant scope                                 | missing token, missing action, tenant mismatch, unknown run                                |
| `POST /runs/:runId/signal`                 | Command | Runtime control              | SignalRunUseCase               | `run:signal`, or `run:cancel` only for compatibility `CANCEL` | missing token, missing action, tenant mismatch, unsupported signal, compatibility disabled |
| `POST /runs/:runId/cancel`                 | Command | Runtime control              | CancelRunUseCase               | `run:cancel`, tenant scope                                    | missing token, missing action, tenant mismatch, non-empty reason                           |
| `POST /runs/:runId/recover`                | Command | Runtime recovery             | RecoverRunUseCase              | recovery command scope, tenant scope                          | missing token, missing action, tenant mismatch, invalid recovery source                    |
| `POST /admin/runs/:runId/rebuild-snapshot` | Command | Runtime repair operations    | registerAdminRoutes            | admin repair action, tenant/admin scope                       | disabled route, missing token, missing action, tenant mismatch                             |

## Compatibility posture

`POST /runs/:runId/signal` with `CANCEL` is compatibility behavior. It may
authorize through the cancel action while the route remains available, but it is
not the canonical cancel command rail.

`POST /runs/:runId/cancel` is the canonical cancel command route. Removing the
signal compatibility path requires a separate governed deprecation plan.

## Transitions

```mermaid
sequenceDiagram
  participant App as app.ts
  participant Routes as registerProtectedRuntimeRoutes
  participant Auth as Protected runtime auth
  participant UseCase as Application owner
  participant Adapter as Runtime/planner/state adapter

  App->>Routes: register protected runtime routes
  Routes->>Routes: bind route-level dependencies
  Routes->>Auth: authenticate and authorize requested scope
  Auth-->>Routes: authorized context or typed denial
  Routes->>UseCase: execute command or query
  UseCase->>Adapter: call owned port/adapter
  Adapter-->>UseCase: domain or read-model result
  UseCase-->>Routes: route response payload
```

## Consumers

- `apps/api/src/app.ts`
- `apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts`
- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts`
- `apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts`
- `apps/api/test/integration/protectedRuntime.integration.test.ts`

## Extension rules

- Add a route only by updating `runtimeRoutes.constants.ts`, this component
  guide, and architecture coverage together.
- Add route behavior only through the owning command/query rail.
- Keep route-group registration focused on composition; route-specific parsing
  and response mapping belong in the route handler component.
- Keep compatibility paths explicit and named as compatibility, not canonical
  product rails.
