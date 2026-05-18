---
title: Runs Dense Table Visual Tokens User Stories
status: Active
owner: Web / Runs
date: 2026-05-18
code_refs:
  - apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
  - apps/web/src/app/views/runs/RunOperationalTable.tsx
  - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
---

# Runs Dense Table Visual Tokens User Stories

## US-F24-RUNS-TOKEN-01: Scan Runs With Workbench Tokens

**As** an operator, **I want** Runs dense tables to use the same visual grammar
as the workbench, **so that** route surfaces feel like one product.

Acceptance:

- Table fields use semantic surface, border, and text tokens.
- Empty and muted table copy use shared text tokens.
- Route components do not own raw `slate-*` field classes.

## US-F24-RUNS-TOKEN-02: Read Status Without Route Color Drift

**As** an operator, **I want** run statuses and event levels to keep stable
meaning across tables, **so that** warning, danger, success, and running states
do not change by route.

Acceptance:

- Run statuses resolve through `routeWorkbenchStatusToneClasses`.
- Event levels resolve through the same status-tone boundary.
- Table view modules do not contain `bg-red-*`, `bg-yellow-*`, `bg-green-*`, or
  `bg-blue-*` literals.

## US-F24-RUNS-TOKEN-03: Preserve Dense Table Semantics

**As** a frontend maintainer, **I want** token convergence to avoid changing row
identity, filters, sorting, and navigation, **so that** F-24 stays visual and
does not reopen F-16 behavior.

Acceptance:

- `runId` and `eventId` stay the row identity sources.
- URL-stable filters remain owned by `runOperationalTableModel`.
- Architecture tests guard visual tokens separately from row semantics.

## Coverage Matrix

| Story                | Surface                       | Test                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------ |
| US-F24-RUNS-TOKEN-01 | Dense table fields            | `runsDomainBoundary.architecture.test.ts`              |
| US-F24-RUNS-TOKEN-02 | Status and event tones        | `runsDomainBoundary.architecture.test.ts`              |
| US-F24-RUNS-TOKEN-03 | Row semantics remain separate | Existing F-16 table model tests and architecture guard |
