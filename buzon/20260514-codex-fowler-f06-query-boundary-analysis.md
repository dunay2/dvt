---
title: F-06 TanStack Query Boundary Fowler Analysis
status: Accepted
date: 2026-05-14
owners:
  - web
related_tasks:
  - F-06
---

# F-06 TanStack Query Boundary Fowler Analysis

## Fowler Reading

The observed smell was shotgun query ownership: views and plugin panels were
mostly using the canonical `queryKeys` registry, but still owned TanStack Query
calls and service-port query functions directly. That left cache lifetime,
staleness, and enabled predicates spread across presentation modules.

The chosen pattern is a thin query boundary. Query hooks own TanStack Query
configuration; views and plugin panels consume read-model hooks and keep only
presentation derivation.

## Improved Patterns

| Before                                                           | After                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `RunsView` support hook owned run workspace query configuration. | `runsQueries.ts` owns `useRunWorkspaceQuery`.            |
| Admin view model owned roles and audit query configuration.      | `workspaceQueries.ts` owns roles and audit hooks.        |
| Artifact view model owned workspace artifact loading.            | `workspaceQueries.ts` owns `useWorkspaceArtifactsQuery`. |
| dbt history panel owned run snapshot and summaries queries.      | `runsQueries.ts` owns history query hooks.               |

## Anti-Patterns Removed

- Presentation modules importing `@tanstack/react-query` directly.
- Service-port query functions constructed inside view-model hooks.
- Cache staleness policy hidden inside plugin panels.

## Remaining Opportunities

- Expand the architecture guard gradually to additional operator views once
  their current query hooks are split cleanly.
- Add mutation-boundary rules when the next slice standardizes invalidation and
  optimistic cache updates.
- Split artifact-specific parsing into a dedicated workspace artifact read
  model if the artifact surface grows beyond dbt manifest/catalog/run-result
  files.

## Teaching For Future Work

Query key centralization alone is not enough. Fowler-style ownership closes when
the module that names the key also owns the query function, cache lifetime, and
enabled predicate. Views should express what they need, not how the remote cache
is populated.
