---
title: Runs Dense Operational Tables Component
status: Active
owner: Web / Runs
last_reviewed: 2026-05-18
domain: frontend
---

# Runs Dense Operational Tables Component

This local component owns table-oriented presentation semantics for Runs and
run event chronology. It does not own runtime authority, event fetching, run
start admission, or shell console streaming.

## Public API

| API                         | Kind         | Owner                   | Contract                                                           |
| --------------------------- | ------------ | ----------------------- | ------------------------------------------------------------------ |
| `buildRunOperationalRows`   | query helper | Run table model         | Maps `RunSummaryItem[]` into dense table rows                      |
| `filterRunOperationalRows`  | query helper | Run table model         | Applies status and text filters without mutating source rows       |
| `sortRunOperationalRows`    | query helper | Run table model         | Applies stable route-owned sort semantics                          |
| `buildRunEventTableRows`    | query helper | Event table model       | Maps shared event presentation models into dense timeline rows     |
| `RunOperationalTable`       | view         | Runs list               | Renders sortable/filterable run rows and route navigation          |
| `RunEventTimelineTable`     | view         | Runs detail             | Renders event chronology as dense rows from shared event semantics |
| `routeWorkbenchTableTokens` | token object | Workbench visual system | Provides semantic dense table field, text, and status tone classes |

## Invariants

1. Dense tables consume `IRunsPort` read models; they do not call adapters.
2. Table row IDs remain backend-owned run IDs or event IDs.
3. Sort and filter state is presentation state; it does not mutate runtime
   snapshots or event chronology.
4. Run status filtering is explicit and URL-stable on `/runs`.
5. Event table rows use `runEventPresentationModel` and
   `runEventPresentationCopy`, so console and detail route semantics do not
   drift.
6. TanStack Table is a rendering primitive only; DVT owns column names,
   filters, routes, and row semantics.
7. Dense table visual states use the local visual-token component instead of
   route-level Tailwind color families.

## State Transitions

```mermaid
stateDiagram-v2
  [*] --> RowsBuilt
  RowsBuilt --> Filtered: status or text filter changes
  Filtered --> Sorted: sort changes
  Sorted --> RowSelected: user opens run
  RowSelected --> FocusedRun: navigate /runs/:runId
  Filtered --> EmptyFiltered: no rows match
  EmptyFiltered --> Filtered: filters clear
```

## Consumer Diagram

```mermaid
flowchart TB
  Port["IRunsPort.listRunSummaries"] --> WorkbenchState["runWorkbenchStateModel"]
  WorkbenchState --> ListView["RunListStateView"]
  ListView --> TableModel["runOperationalTableModel"]
  TableModel --> RunTable["RunOperationalTable"]

  Events["IRunsPort.listRunEvents"] --> TimelineModel["runEventTimelineModel"]
  TimelineModel --> WorkspaceFacade["runWorkspaceFacade"]
  WorkspaceFacade --> WorkspaceView["RunWorkspaceStateView"]
  WorkspaceView --> EventTable["RunEventTimelineTable"]

  EventPresentation["runEventPresentationModel"] --> EventTable
  EventCopy["runEventPresentationCopy"] --> EventTable
  VisualTokens["routeWorkbenchTableTokens"] --> RunTable
  VisualTokens --> EventTable
```

## Consumers

| Consumer               | File                                                                  | Responsibility                                           |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Runs list route        | `apps/web/src/app/views/runs/RunListStateView.tsx`                    | Hosts filter state and route navigation                  |
| Run table model        | `apps/web/src/app/views/runs/runOperationalTableModel.ts`             | Owns row, filter, and sort semantics                     |
| Event table model      | `apps/web/src/app/views/runs/runEventTableModel.ts`                   | Owns event row mapping from shared timeline presentation |
| Run table view         | `apps/web/src/app/views/runs/RunOperationalTable.tsx`                 | Renders dense rows via TanStack Table                    |
| Timeline table view    | `apps/web/src/app/views/runs/RunEventTimelineTable.tsx`               | Renders event rows from shared event presentation        |
| Visual token component | `apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts`  | Owns dense table visual token classes                    |
| Architecture guard     | `apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts` | Prevents non-table dense timeline regressions            |

Local visual-token guide:
[Runs Dense Table Visual Tokens Component](./runs-dense-table-visual-tokens-component.md).

## Mature-System Comparison

Temporal UI and GitHub Actions use tables for run selection and history.
Grafana and Datadog use dense log/event tables with filters and sortable
columns. F-16 follows that model while keeping DVT-specific authority in
`IRunsPort` and DVT-specific row semantics in local view models.

<a id="section-dense-operational-tables-user-stories"></a>

## Runs Dense Operational Tables User Stories

### US-F16-01: Scan Runs As Rows

**As** an operator, **I want** `/runs` to show one row per run, **so that** I
can scan many executions without opening each run.

Acceptance:

- Rows show run ID, status, started time, environment, git SHA, and action.
- Unknown optional fields do not render as authoritative values.
- Row identity uses `RunSummaryItem.runId`.

### US-F16-02: Filter Runs By Status

**As** an operator, **I want** to filter runs by status, **so that** I can focus
on failed, running, completed, pending, or cancelled executions.

Acceptance:

- Status filter accepts only `all`, `pending`, `running`, `completed`,
  `failed`, and `cancelled`.
- Invalid URL status filters fall back to `all`.
- Filter state is reflected in `/runs?status=...`.

### US-F16-03: Search Runs By Operational Text

**As** an operator, **I want** to search run IDs, environment, and git SHA,
**so that** I can locate a run without knowing its exact route.

Acceptance:

- Search is case-insensitive.
- Search never mutates source rows.
- Empty search returns all rows allowed by status filter.

### US-F16-04: Sort Runs

**As** an operator, **I want** sortable run columns, **so that** newest or most
relevant runs can be inspected first.

Acceptance:

- Started time defaults to newest-first.
- Status, environment, run ID, and git SHA have deterministic ordering.
- Sort state is presentation-only and does not call the backend.

### US-F16-05: Open Run From Row

**As** an operator, **I want** a row action to open a run workspace, **so that**
I can move from list scanning to detail inspection.

Acceptance:

- The action navigates to `/runs/:runId`.
- Keyboard and button activation work independently of row hover.

### US-F16-06: Dense Timeline Events

**As** an operator, **I want** run events shown as dense rows, **so that** event
chronology can be scanned without card noise.

Acceptance:

- Rows show sequence, type, level, emitted time, headline, and step.
- Rows reuse `runEventPresentationModel` and copy resolution.
- Timeline tables do not fetch events or infer snapshot evidence.

### US-F16-07: Empty Filter Result

**As** an operator, **I want** a clear empty-filter state, **so that** I know the
run list loaded but the current filters hide all rows.

Acceptance:

- Empty filtered results render a message distinct from no runs available.
- Clearing filters restores the loaded rows.

### Coverage Matrix

| Story     | Rail                     | Test surface                               |
| --------- | ------------------------ | ------------------------------------------ |
| US-F16-01 | `listRunSummaries` query | `RunListStateView.test.tsx`                |
| US-F16-02 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-03 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-04 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-05 | route navigation         | `RunListStateView.test.tsx`                |
| US-F16-06 | `listRunEvents` query    | `RunsView.test.tsx` and architecture guard |
| US-F16-07 | presentation state       | `RunListStateView.test.tsx`                |

> Acceptance scope status: Active. Owner: Web / Runs.
