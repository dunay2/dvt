---
title: Web Constraints & Invariants
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                        | Where Enforced                         | Description                                                                                                                                           |
| ------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| All data fetching must go through `apps/api` or `@dvt/engine` | Architecture boundary policy           | WebComponents may not directly access database or storage layers; all data must be mediated by the API or engine interfaces.                          |
| UI contracts and API definitions must be respected            | API client layer / contract governance | Component props and API payloads must conform to the defined UI contracts; breaking changes require a versioned contract update.                      |
| Only UI domain, API, and engine interactions are permitted    | Architecture boundary policy           | `@dvt/web` components must not import from Planning, Execution, or Infra domain packages directly.                                                    |
| Stateless rendering                                           | WebComponent design invariant          | WebComponents derive all state from external queries (API/engine); no persistent local state is maintained between renders beyond ephemeral UI state. |

## Validation Examples

- A WebComponent attempting to import directly from `@dvt/adapter-postgres` is rejected at the architecture boundary; data must route through `apps/api`.
- An API call payload that does not match the defined UI contract schema is rejected by the API layer with a 400 error, not silently dropped.
- A component rendering run status must handle the case where `fetchStatus()` returns null (e.g., run not found) without throwing an unhandled exception.

## Key Files

- `packages/@dvt/web/src/components/`
- `packages/@dvt/web/src/adapters/APIClient.ts`
- `packages/@dvt/web/src/index.ts`
