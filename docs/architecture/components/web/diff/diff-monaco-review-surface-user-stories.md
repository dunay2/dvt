---
title: Diff Monaco Review Surface User Stories
status: Accepted
owner: Web / Architecture
last_reviewed: 2026-05-19
planning_type: architecture
---

# Diff Monaco Review Surface User Stories

## User Stories

| Story         | User               | Scenario                                      | Acceptance                                                                                        |
| ------------- | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `US-F17B-001` | Operator           | Review graph-level changes first.             | Diff opens with graph changes and summary context before Monaco panes are needed.                 |
| `US-F17B-002` | Analytics engineer | Select SQL Diff for a changed model.          | SQL renders in a Monaco DiffEditor with previous compiled SQL and current file content.           |
| `US-F17B-003` | Analytics engineer | Select Catalog Diff for schema changes.       | Catalog JSON renders in a Monaco DiffEditor and summary badges stay visible.                      |
| `US-F17B-004` | Operator           | SQL file content is loading or unavailable.   | Diff shows governed loading, unavailable, or error state and does not render Monaco.              |
| `US-F17B-005` | Maintainer         | Prevent Monaco from becoming route authority. | Architecture guard proves `DiffView` owns route composition and Monaco stays read-only/diff-only. |

## Scenario Matrix

| Scenario               | State       | Expected behavior                                   | Test                                           |
| ---------------------- | ----------- | --------------------------------------------------- | ---------------------------------------------- |
| Diff changes available | ready       | Graph tab renders change rows.                      | `DiffView.test.tsx`                            |
| No diff changes        | empty       | Empty state renders and tabs stay hidden.           | `DiffView.test.tsx`                            |
| Diff query fails       | error       | Error state renders message from query failure.     | `DiffView.test.tsx`                            |
| SQL tab selected       | ready       | `MonacoDiffViewer` receives SQL labels and content. | `DiffView.test.tsx`                            |
| SQL file loading       | loading     | SQL loading state renders, no Monaco viewer.        | `DiffView.test.tsx`                            |
| SQL file fails         | error       | SQL error state renders, no Monaco viewer.          | `DiffView.test.tsx`                            |
| Graph context missing  | unavailable | SQL and catalog panes fail closed.                  | `DiffView.test.tsx`                            |
| Architecture drift     | n/a         | Read-only, diff-only, route-safe rules are checked. | `diffMonacoReviewSurface.architecture.test.ts` |

## UX Invariants

- The route remains a workbench route, not a standalone IDE.
- Monaco is a review surface, not an editing surface.
- The user can compare SQL and structured JSON without changing shell topology.
- Failures are explicit; the UI does not show a blank editor for missing data.
