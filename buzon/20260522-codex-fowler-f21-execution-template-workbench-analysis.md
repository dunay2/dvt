---
title: F-21 Fowler Analysis - Execution Template Source Generation Workbench
status: Accepted
date: 2026-05-22
owners:
  - apps/web
task_id: F-21
---

# F-21 Fowler Analysis - Execution Template Source Generation Workbench

## Findings

F-21 has mature architectural intent in the roadmap and UI contracts, but the
codebase still lacks a route owner. That is documentation drift and boundary
drift: without `/templates`, future preview, diff, or Canvas handoff work would
either land in Canvas or in Monaco-adjacent components that do not own template
semantics.

Comparable mature systems separate generation surfaces from execution surfaces.
The generation UI owns selection, parameter capture, validation, preview, and
export posture. Provider execution and persistence stay behind explicit backend
contracts. This slice follows that split.

## Antipatterns Removed

| Signal                  | Before                                              | Applied correction                                                            |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Documentation drift     | Templates documented as future state only.          | Local component guide and route implementation.                               |
| Boundary drift          | Canvas or Monaco could become accidental owner.     | DVT shell route owns Templates; Monaco remains future preview infrastructure. |
| Responsibility overload | JSX would likely hold validation and generation.    | Pure presentation model owns catalog and preview projection.                  |
| Hidden authority        | Mock backend semantics could define provider truth. | No backend mocks; preview is deterministic local read model.                  |

## Future Lessons

- Put route ownership in place before enhancing it with Monaco, backend
  contracts, or provider-specific execution.
- Keep provider semantics descriptive until a backend rail accepts them.
- Treat route-visible validation errors as first-class negative behavior, not
  as incidental form state.
- Architecture tests should reject dispatch/apply/persist language in this
  workbench until the relevant backend contracts exist.
