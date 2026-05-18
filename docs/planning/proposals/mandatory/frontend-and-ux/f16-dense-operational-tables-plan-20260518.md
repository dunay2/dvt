---
title: F-16 Dense Operational Tables Plan
status: Active
owner: Web / Architecture
date: 2026-05-18
last_reviewed: 2026-05-18
planning_type: proposal
---

# F-16 Dense Operational Tables Plan

## Think-First Analysis

Problem summary: `/runs` and run timeline events still render as repeated
cards. That was acceptable while protected runtime rails and event chronology
were being stabilized, but it no longer matches the UX guide's mature target
for dense operational surfaces.

Root cause: read authority is now separated through `IRunsPort`,
`runWorkspaceFacade`, and `runEventTimelineModel`, but visual semantics have not
been promoted into a table-owned presentation model. JSX still owns row
formatting, filtering, sorting posture, and repeated card shape.

Constraints and invariants:

- `IRunsPort.listRunSummaries` and `IRunsPort.listRunEvents` remain the query
  rails. F-16 adds no new backend rail.
- TanStack Table is an approved rendering primitive in
  `docs/architecture/components/web/ux-implementation-guide.md`.
- DVT owns row semantics, filters, routes, and copy. TanStack Table does not own
  product semantics.
- Console and Runs timeline semantics must remain converged through
  `runEventTimelineModel` and event presentation helpers.

Options considered:

- Keep cards and add CSS density. Rejected because it preserves repeated
  semantics and weak scanability.
- Add a generic app-wide data-grid abstraction. Rejected as premature because
  only Runs has a concrete row contract in this slice.
- Add local Runs table models and table renderers. Selected because it improves
  operator UX while preserving bounded ownership.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add local run table row/filter/sort model.
- Replace `/runs` card list with a dense table.
- Replace run timeline event cards with dense event rows.
- Add docs, user stories, analysis, and semantic architecture guard.
- Add TanStack Table as the approved dense-table primitive for `@dvt/web`.

Out of scope:

- Backend pagination, server-side filtering, or new protected runtime endpoints.
- Virtualization.
- Cross-route generic data-grid framework.
- Console xterm.js changes.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature F16-DENSE-OPERATIONAL-TABLES-20260518`
- `pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx src/app/views/RunsView.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts`
- `pnpm --filter @dvt/web test:architecture`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                    | Opportunity             | Fowler pattern                           | DDD owner                               | Rail                     | Tests                                                           |
| --------------------------- | ----------------------- | ---------------------------------------- | --------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `/runs` repeated cards      | Duplicate semantics     | Table Data Gateway + Presentation Model  | Runs dense table model                  | `listRunSummaries` query | `runOperationalTableModel.test.ts`, `RunListStateView.test.tsx` |
| status/search filtering     | Primitive obsession     | Parameter Object                         | Runs dense table filter                 | `listRunSummaries` query | `runOperationalTableModel.test.ts`                              |
| timeline card collection    | Responsibility overload | Replace Card Collection with Event Table | Run event timeline table                | `listRunEvents` query    | `RunsView.test.tsx`, architecture guard                         |
| docs say dense table target | Documentation drift     | Component Guide                          | Runs dense operational tables component | none - presentation only | architecture guard, docs lint                                   |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: F16-DENSE-OPERATIONAL-TABLES-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f16-dense-operational-tables-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/runs/dense-operational-tables-component.md
userStories:
  - docs/architecture/components/web/runs/dense-operational-tables-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/web/package.json
  - pnpm-lock.yaml
  - apps/web/src/app/views/RunsView.test.tsx
  - apps/web/src/app/views/runs/RunStates.test.tsx
  - apps/web/src/app/views/runs/RunListStateView.tsx
  - apps/web/src/app/views/runs/RunListStateView.test.tsx
  - apps/web/src/app/views/runs/RunWorkspaceStateView.tsx
  - apps/web/src/app/views/runs/RunTimelineEventCard.tsx
  - apps/web/src/app/views/runs/RunOperationalTable.tsx
  - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
  - apps/web/src/app/views/runs/runOperationalTableModel.ts
  - apps/web/src/app/views/runs/runOperationalTableModel.test.ts
  - apps/web/src/app/views/runs/runEventTableModel.ts
  - apps/web/src/app/views/runs/runEventTableModel.test.ts
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - apps/web/src/app/views/runs/runStatesCopy.ts
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/runs/component-runs.md
  - docs/architecture/components/web/runs/dvt-runs-frontend-architecture.md
  - docs/architecture/components/web/runs/dense-operational-tables-component.md
  - docs/architecture/components/web/runs/dense-operational-tables-user-stories.md
  - docs/architecture/components/web/runs/run-event-timeline-component.md
  - docs/architecture/components/web/runs/run-event-timeline-user-stories.md
  - docs/architecture/components/web/runs/user-stories-runs.md
  - docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f16-dense-operational-tables-plan-20260518.md
  - docs/planning/closeouts/20260518-f16-dense-operational-tables-closeout.md
  - buzon/20260518-f16-fowler-dense-operational-tables-analysis.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
commandQueryRails:
  - name: listRunSummaries
    type: query
    dddOwner: Runs read model
  - name: listRunEvents
    type: query
    dddOwner: Run event timeline read model
domainObjects:
  - name: RunOperationalTableModel
    type: presentation read model
    owner: apps/web
  - name: RunEventTimelineTable
    type: presentation renderer
    owner: apps/web
fowlerSignals:
  - Duplicate semantics
  - Responsibility overload
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
cypressFlows:
  - N/A - F-16 changes route presentation and is covered by React/Vitest route tests.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts
  - pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx src/app/views/RunsView.test.tsx
  - pnpm --filter @dvt/web test:architecture
  - pnpm --filter @dvt/web typecheck
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f16-run-table-model
    redTest: pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts
    expectedFailure: runOperationalTableModel module does not exist.
    patchSurfaces:
      - apps/web/src/app/views/runs/runOperationalTableModel.ts
      - apps/web/src/app/views/runs/runOperationalTableModel.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts
  - id: f16-run-list-table-view
    redTest: pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx
    expectedFailure: run list still renders cards instead of dense table controls.
    patchSurfaces:
      - apps/web/src/app/views/runs/RunListStateView.tsx
      - apps/web/src/app/views/runs/RunOperationalTable.tsx
      - apps/web/src/app/views/runs/RunListStateView.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx
  - id: f16-event-table-view
    redTest: pnpm --filter @dvt/web test -- src/app/views/RunsView.test.tsx
    expectedFailure: run detail timeline renders event cards instead of dense event table rows.
    patchSurfaces:
      - apps/web/src/app/views/runs/RunWorkspaceStateView.tsx
      - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
      - apps/web/src/app/views/runs/runEventTableModel.ts
      - apps/web/src/app/views/runs/runEventTableModel.test.ts
      - apps/web/src/app/views/RunsView.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/RunsView.test.tsx
symbols:
  - name: buildRunOperationalRows
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalTable
    path: apps/web/src/app/views/runs/RunOperationalTable.tsx
    dddOwner: Runs dense table view
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics, Documentation drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx]
  - name: RunEventTimelineTable
    path: apps/web/src/app/views/runs/RunEventTimelineTable.tsx
    dddOwner: Run event timeline view
    cqRails: [listRunEvents]
    fowlerSignals: [Responsibility overload]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/RunsView.test.tsx]
  - name: buildRunEventTableRows
    path: apps/web/src/app/views/runs/runEventTableModel.ts
    dddOwner: Run event timeline presentation model
    cqRails: [listRunEvents]
    fowlerSignals: [Responsibility overload, Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runEventTableModel.test.ts]
  - name: buildRunEvent
    path: apps/web/src/app/views/RunsView.test.tsx
    dddOwner: Runs route test fixture
    cqRails: [listRunEvents]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/RunsView.test.tsx]
  - name: RunEventTimelineTableProps
    path: apps/web/src/app/views/runs/RunEventTimelineTable.tsx
    dddOwner: Run event timeline view
    cqRails: [listRunEvents]
    fowlerSignals: [Responsibility overload]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/RunsView.test.tsx]
  - name: levelTone
    path: apps/web/src/app/views/runs/RunEventTimelineTable.tsx
    dddOwner: Run event timeline view
    cqRails: [listRunEvents]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runEventTableModel.test.ts]
  - name: buildSummary
    path: apps/web/src/app/views/runs/RunListStateView.test.tsx
    dddOwner: Runs list test fixture
    cqRails: [listRunSummaries]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx]
  - name: RunOperationalTableProps
    path: apps/web/src/app/views/runs/RunOperationalTable.tsx
    dddOwner: Runs dense table view
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx]
  - name: nextSort
    path: apps/web/src/app/views/runs/RunOperationalTable.tsx
    dddOwner: Runs dense table view
    cqRails: [listRunSummaries]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/RunListStateView.test.tsx]
  - name: buildEvent
    path: apps/web/src/app/views/runs/runEventTableModel.test.ts
    dddOwner: Run event timeline test fixture
    cqRails: [listRunEvents]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runEventTableModel.test.ts]
  - name: RunEventTableRow
    path: apps/web/src/app/views/runs/runEventTableModel.ts
    dddOwner: Run event timeline presentation model
    cqRails: [listRunEvents]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runEventTableModel.test.ts]
  - name: buildRun
    path: apps/web/src/app/views/runs/runOperationalTableModel.test.ts
    dddOwner: Runs dense table test fixture
    cqRails: [listRunSummaries]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: DEFAULT_RUN_OPERATIONAL_TABLE_STATE
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RUN_SORT_COLUMNS
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RUN_STATUS_FILTERS
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalRow
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Presentation Model]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalSortColumn
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalSortDirection
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalStatusFilter
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalTableFilters
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalTableSort
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: RunOperationalTableState
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: compareNullableNumber
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: compareText
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: durationBetween
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: filterRunOperationalRows
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: formatDateTime
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: formatDuration
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: isSortColumn
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: isSortDirection
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: isStatusFilter
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: matchesQuery
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: matchesStatus
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: parseRunOperationalTableSearchParams
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: serializeRunOperationalTableSearchParams
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
  - name: sortRunOperationalRows
    path: apps/web/src/app/views/runs/runOperationalTableModel.ts
    dddOwner: Runs dense table model
    cqRails: [listRunSummaries]
    fowlerSignals: [Parameter Object]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - route presentation covered by Vitest.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts]
```
