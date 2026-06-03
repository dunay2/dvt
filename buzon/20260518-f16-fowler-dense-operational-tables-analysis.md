---
title: F-16 Fowler Analysis - Dense Operational Tables
status: Review
owner: Web / Architecture
date: 2026-05-18
---

# F-16 Fowler Analysis - Dense Operational Tables

## Scope

This analysis covers the Runs frontend work after F-10 and F-14, with emphasis
on `/runs`, `/runs/:runId`, the run event timeline, and the shell console event
stream.

## Mature-System Comparison

Mature operational systems such as Temporal UI, Grafana, Datadog Logs, and
GitHub Actions separate three concerns:

1. Authoritative queries and commands.
2. Row-oriented read models for dense inspection.
3. Surface-specific renderers.

DVT improved concern separation in F-10 by converging console and Runs on
`runEventTimelineModel`, and improved CI proof in F-14 by making frontend tests a
first-class lane. F-16 should now apply the same maturity to visual density:
tables consume run and event read models, while `IRunsPort` remains the
authority for `listRunSummaries`, `getRunSnapshot`, `startRun`, and
`listRunEvents`.

## Improved Patterns

| Area                | Improvement already present                              | Pattern              |
| ------------------- | -------------------------------------------------------- | -------------------- |
| Runs data access    | Views consume `IRunsPort` through service/facade seams   | Hexagonal port       |
| Timeline chronology | Console and detail route share ordering/dedupe semantics | Shared read model    |
| Route state         | Runs workbench uses a discriminated union                | Explicit state model |
| Frontend tests      | Web has a dedicated governed CI lane                     | Governed test lane   |

## Antipatterns Detected

| Signal                       | Current shape                                                                               | Risk                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Responsibility overload      | `RunWorkspaceStateView` derives evidence, provenance, diagnostics, and renders all sections | Hard to reuse dense row semantics                                      |
| Card overuse                 | `/runs` and timeline render repeated cards                                                  | Poor scanning when run/event counts grow                               |
| Duplicate formatting         | started/completed time, status, step, artifact labels appear in local JSX                   | Drift across list/detail/timeline                                      |
| Semantic under-encapsulation | No named dense table model yet                                                              | Architecture tests can only guard component names, not table semantics |
| Documentation drift          | UX guide says TanStack Table is the target, code still uses cards                           | Product docs overstate implementation                                  |

## Component Grouping

F-16 should group dense operational behavior under a local Runs component:

- `runOperationalTableModel.ts`: row and filter/sort semantics for run summaries.
- `RunOperationalTable.tsx`: TanStack Table renderer for `/runs`.
- `RunEventTimelineTable.tsx`: dense timeline renderer for event-heavy run detail.
- `dense-operational-tables-component.md`: local API, invariants, transitions,
  consumers, and diagrams.

## Repetitions To Fix

- Status, timestamp, environment, and git display logic repeated in card JSX.
- Event row metadata repeated between console and timeline card visual language.
- Navigation action repeated inside card container and button.
- Docs and architecture tests do not yet name the dense table component.

## Drift To Fix

- Code drift: UX guide names TanStack Table as the approved dense-table
  primitive, but Runs still renders cards.
- Documentation drift: Runs component guide lists `RunTimelineEventCard` as the
  durable renderer; F-16 should promote dense timeline rows.
- Test drift: architecture guard proves event convergence, but not dense table
  semantic ownership.

## Opportunities

| Opportunity          | Fowler framing                                 | F-16 action                                      |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Dense run scanning   | Replace Repeated Cards with Table Data Gateway | Add run table model and renderer                 |
| Timeline scanability | Replace Card Collection with Event Table       | Add timeline table rows                          |
| Formatting drift     | Extract Presentation Model                     | Centralize run table row formatting              |
| Hidden visual policy | Semantic Component Boundary                    | Add component guide and architecture guard       |
| Future filters       | Parameter Object                               | Use table filter state instead of local booleans |

## Future Lessons

1. Add dense read models before adding more route-local JSX.
2. Keep third-party table objects as render primitives, not product semantics.
3. Treat docs that name a library as implementation promises requiring tests.
4. Update user stories when visual density changes workflow expectations.
5. Architecture tests should prove semantic row ownership, not only file
   presence or barrel thinness.

## Applied Changes

F-16 applies the selected option:

- Added local Runs dense table models for run summaries and timeline events.
- Added TanStack Table as the renderer primitive for `@dvt/web`.
- Replaced `/runs` repeated cards with `RunOperationalTable`.
- Replaced run event timeline cards with `RunEventTimelineTable`.
- Removed the legacy `RunTimelineEventCard.tsx` renderer.
- Added semantic architecture coverage for URL-stable filters, table model
  ownership, TanStack usage, and event presentation convergence.
- Updated component and timeline docs so durable docs describe rows, not cards.

## ADR Posture

No ADR was created. The slice implements existing governed posture from the UX
implementation guide, command/query rail governance, and Fowler opportunity
planning governance. It adds no backend rail, runtime contract, adapter
contract, persistence boundary, or new architectural decision.
