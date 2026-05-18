---
title: Runs Dense Operational Tables User Stories
status: Active
owner: Web / Runs
date: 2026-05-18
code_refs:
  - apps/web/src/app/views/runs/runOperationalTableModel.ts
  - apps/web/src/app/views/runs/RunOperationalTable.tsx
  - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
---

# Runs Dense Operational Tables User Stories

## US-F16-01: Scan Runs As Rows

**As** an operator, **I want** `/runs` to show one row per run, **so that** I
can scan many executions without opening each run.

Acceptance:

- Rows show run ID, status, started time, environment, git SHA, and action.
- Unknown optional fields do not render as authoritative values.
- Row identity uses `RunSummaryItem.runId`.

## US-F16-02: Filter Runs By Status

**As** an operator, **I want** to filter runs by status, **so that** I can focus
on failed, running, completed, pending, or cancelled executions.

Acceptance:

- Status filter accepts only `all`, `pending`, `running`, `completed`,
  `failed`, and `cancelled`.
- Invalid URL status filters fall back to `all`.
- Filter state is reflected in `/runs?status=...`.

## US-F16-03: Search Runs By Operational Text

**As** an operator, **I want** to search run IDs, environment, and git SHA,
**so that** I can locate a run without knowing its exact route.

Acceptance:

- Search is case-insensitive.
- Search never mutates source rows.
- Empty search returns all rows allowed by status filter.

## US-F16-04: Sort Runs

**As** an operator, **I want** sortable run columns, **so that** newest or most
relevant runs can be inspected first.

Acceptance:

- Started time defaults to newest-first.
- Status, environment, run ID, and git SHA have deterministic ordering.
- Sort state is presentation-only and does not call the backend.

## US-F16-05: Open Run From Row

**As** an operator, **I want** a row action to open a run workspace, **so that**
I can move from list scanning to detail inspection.

Acceptance:

- The action navigates to `/runs/:runId`.
- Keyboard and button activation work independently of row hover.

## US-F16-06: Dense Timeline Events

**As** an operator, **I want** run events shown as dense rows, **so that** event
chronology can be scanned without card noise.

Acceptance:

- Rows show sequence, type, level, emitted time, headline, and step.
- Rows reuse `runEventPresentationModel` and copy resolution.
- Timeline tables do not fetch events or infer snapshot evidence.

## US-F16-07: Empty Filter Result

**As** an operator, **I want** a clear empty-filter state, **so that** I know the
run list loaded but the current filters hide all rows.

Acceptance:

- Empty filtered results render a message distinct from no runs available.
- Clearing filters restores the loaded rows.

## Coverage Matrix

| Story     | Rail                     | Test surface                               |
| --------- | ------------------------ | ------------------------------------------ |
| US-F16-01 | `listRunSummaries` query | `RunListStateView.test.tsx`                |
| US-F16-02 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-03 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-04 | `listRunSummaries` query | `runOperationalTableModel.test.ts`         |
| US-F16-05 | route navigation         | `RunListStateView.test.tsx`                |
| US-F16-06 | `listRunEvents` query    | `RunsView.test.tsx` and architecture guard |
| US-F16-07 | presentation state       | `RunListStateView.test.tsx`                |
