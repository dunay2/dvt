---
title: Artifacts Monaco Read-Only Viewer User Stories
status: Accepted
owner: Web / Architecture
last_reviewed: 2026-05-20
planning_type: architecture
---

# Artifacts Monaco Read-Only Viewer User Stories

## User Stories

| Story         | User               | Scenario                                      | Acceptance                                                                                                  |
| ------------- | ------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `US-F17C-001` | Analytics engineer | Inspect a workspace `manifest.json`.          | Artifacts renders a read-only JSON Monaco viewer with the workspace manifest payload.                       |
| `US-F17C-002` | Analytics engineer | Inspect `run_results.json`.                   | Selecting the run results tab renders the structured payload without editing affordances.                   |
| `US-F17C-003` | Analytics engineer | Inspect `catalog.json`.                       | Selecting the catalog tab renders the structured payload without changing route shell topology.             |
| `US-F17C-004` | Operator           | A supported artifact is missing.              | The selected tab shows an explicit unavailable state and no Monaco viewer.                                  |
| `US-F17C-005` | Operator           | Workspace artifact loading fails.             | The route shows the governed error state and no Monaco viewer.                                              |
| `US-F17C-006` | Maintainer         | Prevent Monaco from becoming route authority. | Architecture tests prove `ArtifactsView` composes the route and Monaco remains a read-only panel primitive. |

## Scenario Matrix

| Scenario                      | State          | Expected behavior                                                      | Test                                                 |
| ----------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Workspace artifacts available | ready          | Preview tabs render with a read-only Monaco viewer.                    | `ArtifactsView.test.tsx`                             |
| Imported manifest available   | ready          | Manifest tab uses imported manifest payload before workspace manifest. | `ArtifactsView.test.tsx`                             |
| Missing artifact payload      | ready-partial  | Unavailable state renders and no placeholder JSON appears.             | `ArtifactsView.test.tsx`                             |
| Workspace query loading       | loading        | Loading state renders and no Monaco viewer appears.                    | `ArtifactsView.test.tsx`                             |
| Workspace query fails         | error          | Error state renders and no Monaco viewer appears.                      | `ArtifactsView.test.tsx`                             |
| Invalid import                | invalid-import | Rejection message renders and no Monaco viewer appears.                | `ArtifactsView.test.tsx`                             |
| Architecture drift            | n/a            | Read-only, route-safe, non-Canvas-hosted rules are checked.            | `artifactsMonacoReadonlyViewer.architecture.test.ts` |

## UX Invariants

- Artifacts is an inspection route, not an editor.
- The top-level route shell and navigation remain unchanged.
- Monaco appears only when a real payload is available.
- The user does not see fake full-file commands or disabled editing promises.
- Failures are explicit and do not render blank editor panes.
