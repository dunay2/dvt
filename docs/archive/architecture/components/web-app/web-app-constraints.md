---
title: Web App Constraints & Invariants
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web App Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                | Where Enforced                    | Description                                                                                                                                        |
| --------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| All data access must be mediated by `apps/api` or `@dvt/engine`       | Architecture boundary policy      | `apps/web` must not import from database adapters, Planning domain packages, or Infra packages directly.                                           |
| UI contracts and API definitions govern all API interactions          | APIGateway / contract governance  | Request and response shapes exchanged with `apps/api` must conform to the published API contracts; deviations require a versioned contract update. |
| WebAggregate is the sole aggregate root for UI state                  | WebAggregate design invariant     | UIComponentAggregates may not be directly manipulated by external callers; all state transitions flow through WebAggregate.                        |
| Only UI domain, API, and engine components may be direct dependencies | Architecture boundary policy      | `apps/web` must not take runtime dependencies on Planning, Execution, Infra, or Shared Boundary domain packages.                                   |
| Engine status data is read-only in the UI                             | EngineStatusFeed design invariant | The web application may only read workflow status from `@dvt/engine`; it must not write to engine state directly.                                  |

## Validation Examples

- A component that attempts to import `@dvt/adapter-postgres` directly is rejected at the architecture boundary review; the data must be fetched through `apps/api`.
- A status query that returns an empty or unknown run ID is handled gracefully — the UI displays a "not found" state rather than throwing an unhandled error.
- An attempt to modify workflow state through the EngineStatusFeed is blocked; the feed is read-only and any mutation attempts are routed via API endpoints.

## Key Files

- `apps/web/src/domain/WebAggregate.ts`
- `apps/web/src/gateways/APIGateway.ts`
- `apps/web/src/index.ts`
