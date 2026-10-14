---
title: Runs Dense Table Visual Tokens Component
status: Active
owner: Web / Runs
last_reviewed: 2026-05-18
domain: frontend
---

# Runs Dense Table Visual Tokens Component

## Purpose

This component owns the visual-token boundary for dense Runs tables. It keeps
Runs list and event chronology tables aligned with the operator-workbench visual
system without giving route components authority over raw color families.

Owned concern: dense table views consume named table tokens; `theme.css` owns
raw semantic values.

## Public API

| API                                          | Kind         | Contract                                                                          |
| -------------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `routeWorkbenchDenseTableClasses`            | constant     | Shared dense table field, muted text, subtle text, empty cell, and layout classes |
| `routeWorkbenchStatusToneClasses`            | constant     | Semantic status badge classes for run status and event level tones                |
| `getRouteWorkbenchStatusToneClassName(kind)` | query helper | Returns the badge class for a known semantic status tone                          |

## Invariants

1. The component composes semantic CSS variables such as `--surface-app`,
   `--border-default`, `--text-muted`, and `--status-*`.
2. Runs table view modules do not use `slate-*`, `bg-red-*`, `bg-blue-*`,
   `bg-yellow-*`, `bg-green-*`, or raw hex color classes.
3. The token component does not own row identity, route navigation, filter
   state, sorting, API calls, or event interpretation.
4. Status colors are semantic, not decorative. Run status and event level tones
   must resolve through the same token surface.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> SemanticToneRequested
  SemanticToneRequested --> SuccessTone: completed or SUCCESS
  SemanticToneRequested --> RunningTone: running or INFO
  SemanticToneRequested --> WarningTone: WARN
  SemanticToneRequested --> DangerTone: failed or ERROR
  SemanticToneRequested --> NeutralTone: missing or default
  SuccessTone --> BadgeRendered
  RunningTone --> BadgeRendered
  WarningTone --> BadgeRendered
  DangerTone --> BadgeRendered
  NeutralTone --> BadgeRendered
```

## Consumer Diagram

```mermaid
flowchart TB
  Theme["apps/web/src/styles/theme.css"]
  Tokens["routeWorkbenchTableTokens.ts"]
  RunStatus["runStatesModel.ts"]
  RunTable["RunOperationalTable.tsx"]
  EventTable["RunEventTimelineTable.tsx"]
  Guard["runsDomainBoundary.architecture.test.ts"]

  Theme --> Tokens
  Tokens --> RunStatus
  Tokens --> RunTable
  Tokens --> EventTable
  Guard --> Tokens
  Guard --> RunTable
  Guard --> EventTable
```

## Consumers

| Consumer                                  | Responsibility                                                  |
| ----------------------------------------- | --------------------------------------------------------------- |
| `RunOperationalTable`                     | Uses dense field, muted, and empty-cell classes                 |
| `RunEventTimelineTable`                   | Uses event level badge tones and subtle text classes            |
| `runStatesModel`                          | Maps run statuses to semantic badge tone classes                |
| `runsDomainBoundary.architecture.test.ts` | Prevents route-level dense-table color hardcodes from returning |

## Negative Rules

- Do not add raw Tailwind color families to Runs dense table view modules.
- Do not add a second status-tone function inside table views.
- Do not move API, query, or event authority into this token module.
- Do not use this component as a global design-system rewrite; it is a narrow
  F-24 convergence point for dense workbench tables.

<a id="section-runs-dense-table-visual-tokens-user-stories"></a>

## Runs Dense Table Visual Tokens User Stories

### US-F24-RUNS-TOKEN-01: Scan Runs With Workbench Tokens

**As** an operator, **I want** Runs dense tables to use the same visual grammar
as the workbench, **so that** route surfaces feel like one product.

Acceptance:

- Table fields use semantic surface, border, and text tokens.
- Empty and muted table copy use shared text tokens.
- Route components do not own raw `slate-*` field classes.

### US-F24-RUNS-TOKEN-02: Read Status Without Route Color Drift

**As** an operator, **I want** run statuses and event levels to keep stable
meaning across tables, **so that** warning, danger, success, and running states
do not change by route.

Acceptance:

- Run statuses resolve through `routeWorkbenchStatusToneClasses`.
- Event levels resolve through the same status-tone boundary.
- Table view modules do not contain `bg-red-*`, `bg-yellow-*`, `bg-green-*`, or
  `bg-blue-*` literals.

### US-F24-RUNS-TOKEN-03: Preserve Dense Table Semantics

**As** a frontend maintainer, **I want** token convergence to avoid changing row
identity, filters, sorting, and navigation, **so that** F-24 stays visual and
does not reopen F-16 behavior.

Acceptance:

- `runId` and `eventId` stay the row identity sources.
- URL-stable filters remain owned by `runOperationalTableModel`.
- Architecture tests guard visual tokens separately from row semantics.

### Coverage Matrix

| Story                | Surface                       | Test                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------ |
| US-F24-RUNS-TOKEN-01 | Dense table fields            | `runsDomainBoundary.architecture.test.ts`              |
| US-F24-RUNS-TOKEN-02 | Status and event tones        | `runsDomainBoundary.architecture.test.ts`              |
| US-F24-RUNS-TOKEN-03 | Row semantics remain separate | Existing F-16 table model tests and architecture guard |

> Acceptance scope status: Active. Owner: Web / Runs.
