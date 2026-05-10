---
title: Fowler Analysis For Web Workspace Port Decomposition
status: Draft
owner: Codex / Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: analysis
---

# Fowler Analysis For Web Workspace Port Decomposition

## Scope

This analysis reviews the web/API integration work completed in the preceding
branch and narrows the next remediation to the web workspace port surface.

The review is grounded in:

- `docs/planning/reviews/20260510-web-api-integration-gap-review.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-route-parity-remediation-plan-20260510.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `apps/web/src/app/ports/workspace.ts`
- `apps/web/src/app/services/workspace/workspaceService.api.ts`
- `apps/web/src/app/services/composition/appServices.ts`

## Mature-System Comparison

Mature systems keep product intent behind intention-revealing ports that map to
owned command/query rails. A mature web application does not expose one broad
workspace gateway for graph snapshots, file reads, diff, plugin catalog,
admin read models, warehouse import, and file writes. It separates those
responsibilities because they have different owners, authorization rules,
freshness expectations, failure modes, and backend readiness.

The current system improved by making missing API-mode routes fail closed. That
is a mature posture for an unavailable backend rail. The remaining issue is
semantic encapsulation: the broad `IWorkspacePort` still makes unrelated product
capabilities look like one dependency.

## Improved Patterns

| Area                        | Improvement                                                                                              | Mature-system pattern                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Effective workspace context | Protected web routes now ask the server for effective scope before rendering.                            | Server-owned read model; UI projection, not UI authority |
| Missing API routes          | `workspaceService.api.ts` no longer calls orphan `/diff`, `/plugins`, `/admin`, or file-write endpoints. | Fail-closed adapter boundary                             |
| Graph draft authoring       | Graph draft authoring has a separate port from broad workspace reads.                                    | Hexagonal port per owned concern                         |
| Route cataloging            | Workspace context and runtime rails are explicit.                                                        | Command/query rail governance                            |

## Antipatterns Still Present

| Antipattern                    | Evidence                                                                                                  | Impact                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| God Port                       | `IWorkspacePort` owns graph, diff, plugins, RBAC, audit, warehouse import, files, and file writes.        | Consumers depend on more authority than they need.                              |
| Interface Pollution            | Tests and views must stub unrelated methods to exercise one capability.                                   | High test noise and accidental coupling.                                        |
| Hidden Authority               | Mock workspace service still creates diff, roles, audit, imports, and file mutations.                     | Demo behavior can look like product truth.                                      |
| Route-Shaped Product Semantics | Missing operations are named after expected HTTP routes, not accepted read models.                        | Backend gaps are harder to reason about.                                        |
| Documentation Drift Risk       | The route-parity plan says port split is excluded, but the review names it as the next major remediation. | Future work can reintroduce broad-port drift unless a plan owns the next slice. |

## Components That Should Be Grouped

| Component                      | Owned concern                                               | Current files                                                        | Target grouping                                                                         |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Workspace graph snapshot query | Read projected graph draft snapshot for presentation.       | `workspace.ts`, `workspaceService.api.ts`, graph projection helpers  | `workspaceGraphSnapshotPort`                                                            |
| Workspace files query          | List/read workspace files through existing API read rails.  | `workspace.ts`, `workspaceService.api.ts`, `workspaceFilesHttp.ts`   | `workspaceFilesQueryPort`                                                               |
| Workspace diff query           | Read authoritative diff changes when a backend rail exists. | `workspace.ts`, `workspaceService.api.ts`, `DiffView`                | `workspaceDiffQueryPort` with unavailable API mode until rail exists                    |
| Plugin catalog query           | Read backend-published plugin availability.                 | `workspace.ts`, `workspaceService.api.ts`, plugin registry consumers | `workspacePluginCatalogPort` with presentation-only registry clearly separated          |
| Admin read models              | Read admin roles and audit log.                             | `workspace.ts`, `workspaceService.api.ts`, `AdminView`               | `workspaceAdminReadPort` with unavailable API mode until rail exists                    |
| Warehouse source import        | Discover and import warehouse source metadata.              | `workspace.ts`, mock service, source import wizard                   | `warehouseSourceImportPort` fenced as demo-only until backend commands exist            |
| Workspace file write           | Persist generated file content.                             | `workspace.ts`, canvas preview provenance                            | Separate command port only after `SaveWorkspaceFileContent` is accepted and implemented |

## Repetition

- Tests repeatedly build full `IWorkspacePort` stubs even when a view only needs
  one or two methods.
- API unavailable handling repeats capability names in a broad adapter instead
  of localizing them by capability-specific port.
- Mock service keeps graph, files, diff, admin, plugin, and source-import
  fixtures in one stateful runtime.
- Views consume `workspaceService` as a single dependency, so dependency shape
  does not communicate owned concern.

## Opportunities

1. Split `IWorkspacePort` into concern-specific ports before adding new backend
   routes.
2. Keep API-mode missing rails explicit and unavailable, but move each
   unavailable state to the capability port that owns it.
3. Add a semantic architecture guard that fails when a broad workspace port
   reappears or when a consumer imports a larger port than its capability needs.
4. Add docblocks to the top of each workspace module naming the owned concern.
5. Update component docs so consumers can see public API, invariants,
   transitions, and current backend readiness.

## Drift To Fix

| Drift                                                                                                    | Fix                                                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `IWorkspacePort` name implies one domain, but it mixes several bounded concerns.                         | Replace with explicit ports per capability.                                     |
| API adapter fails closed but still implements the broad interface.                                       | Replace broad adapter object with composed, named port adapters.                |
| Mock adapter remains a small runtime.                                                                    | Fence mock-only capabilities and keep them out of API-mode service composition. |
| Tests validate route parity but not semantic port ownership.                                             | Add architecture test for semantic dependency boundaries.                       |
| Component documentation exists for effective workspace context but not for workspace port decomposition. | Add local component guide and user stories.                                     |

## ADR Assessment

No new ADR is required for the port decomposition slice itself. The slice
applies existing governance:

- `command-query-rail-governance.md`
- `fowler-opportunity-planning-governance.md`
- `ADR-0055-server-owned-effective-workspace-context.md`

A new ADR should be created only when a future slice accepts a new backend rail
for diff, plugin catalog, admin read models, warehouse import, or workspace file
write semantics.
