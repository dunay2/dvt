---
title: Monaco Visual Token User Stories
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
component: Monaco visual tokens
---

# Monaco Visual Token User Stories

| ID            | Actor               | Scenario                                        | Acceptance                                                                            |
| ------------- | ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| US-F24-MV-001 | Frontend maintainer | Adds a Monaco-backed route pane.                | The pane uses the existing Monaco gateway and inherits `monacoVisualClasses.surface`. |
| US-F24-MV-002 | Frontend maintainer | Changes Monaco visual chrome.                   | The change is made in `monacoVisualTokens.ts`, not in each route or frame component.  |
| US-F24-MV-003 | Reviewer            | Reviews Code, Diff, Artifacts, or Templates UI. | All embedded Monaco surfaces use `monacoTheme` and owned option presets.              |
| US-F24-MV-004 | Architecture owner  | Checks route-frame ownership.                   | `RouteWorkbenchFrame` no longer exports Monaco-specific visual tokens.                |

## Test Matrix

| Scenario                                                | Test                                                 |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Monaco visual classes and options stay centrally owned  | `monacoVisualTokens.architecture.test.ts`            |
| Code editable-access semantics keep using Monaco safely | `codeMonacoEditableAccess.architecture.test.ts`      |
| Diff review surface stays read-only and Diff-owned      | `diffMonacoReviewSurface.architecture.test.ts`       |
| Artifacts payload viewer stays read-only                | `artifactsMonacoReadonlyViewer.architecture.test.ts` |
| Templates generated-source preview stays read-only      | `templatesMonacoPreview.architecture.test.ts`        |
