---
title: Web Constraints & Invariants
status: Active
owner: UI / Visualization Domain
last_reviewed: 2026-05-08
---

# Web Constraints & Invariants

This document records active constraints for the `apps/web` component. The
frontend is a browser shell and presentation boundary; runtime authority remains
behind `apps/api` rails and backend ports.

## Constraints and Invariants

| Constraint / Invariant                             | Where Enforced                           | Description                                                                                                                                 |
| -------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| All data fetching must go through `apps/api`       | Architecture boundary policy             | View components may not directly access database or storage layers; all runtime data is mediated by API rails and frontend service ports.   |
| UI contracts and API definitions must be respected | Port adapter layer / contract governance | Component props and API payloads must conform to frontend DTOs and API route contracts; breaking changes require governed contract updates. |
| Runtime reads and commands are tenant-scoped       | API rail catalog and service adapters    | `GET /runs`, `GET /runs/:runId`, `GET /runs/:runId/events`, and `POST /runs/start` carry authenticated tenant or workspace scope.           |
| Only UI domain and API interactions are permitted  | Architecture boundary policy             | `apps/web` code must not import directly from Planning, Execution, Infra, database, or provider-adapter implementation packages.            |
| Stateless view rendering                           | View component design invariant          | View components derive durable state from query results and service facades; only ephemeral UI state may be local to components.            |

## Validation Examples

- A ViewComponent attempting to import directly from `@dvt/adapter-postgres` is rejected at the architecture boundary; data must route through `apps/api`.
- An API call payload that does not match the defined UI contract schema is rejected by the API layer with a 400 error, not silently dropped.
- A component rendering run status must handle the case where `getRunSnapshot()` returns null (e.g., run not found) without throwing an unhandled exception.
- A run list query without the expected session-derived tenant/workspace scope must fail authorization or validation rather than returning cross-tenant data.

## Key Files

- `apps/web/src/app/services/runs/runsService.ts`
- `apps/web/src/app/services/runs/runsService.api.ts`
- `apps/web/src/app/ports/runs.ts`
- `apps/web/src/app/services/runs/runsApiPayloads.ts`
- `apps/api/src/application/ports/protectedRuntimeRunRailVocabulary.ts`
