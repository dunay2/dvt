---
title: F-17-D Fowler Analysis - Templates Monaco Preview
status: Accepted
owner: Web / Architecture
date: 2026-05-22
planning_type: analysis
---

# F-17-D Fowler Analysis - Templates Monaco Preview

## Mature-System Comparison

Mature workbench products embed code viewers where the user reviews generated
source, but they keep generation and command authority outside the editor
primitive. VS Code-like editor affordances do not imply save or execution unless
there is an explicit command rail.

Templates now has route ownership and deterministic preview generation. The
missing maturity marker is an embedded read-only code surface with the same
lazy Monaco gateway already used by Diff and Artifacts.

## Improved Patterns

| Area              | Pattern                   | Improvement                                                      |
| ----------------- | ------------------------- | ---------------------------------------------------------------- |
| Preview rendering | Extract Component         | `TemplateMonacoPreviewPanel` owns source-to-viewer adaptation.   |
| Monaco boundary   | Gateway                   | `MonacoCodeViewer` stays the shared lazy read-only code gateway. |
| Route semantics   | Application Controller    | `TemplatesView` owns route state and does not import Monaco.     |
| Safety            | Semantic Fitness Function | Architecture tests guard read-only posture and route ownership.  |

## Antipatterns Detected

| Antipattern         | Evidence                                            | Fix                                              |
| ------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Inline presentation | Ready preview is rendered as a route-local `<pre>`. | Extract panel and delegate to Monaco gateway.    |
| Hidden authority    | Code editor primitives can imply edit/save.         | Use read-only viewer only and guard no commands. |
| Documentation drift | F-21 named Monaco as future work.                   | Add F-17-D docs, stories, and feature plan.      |
| Boundary drift      | Templates could import Monaco directly.             | Keep Monaco behind `TemplateMonacoPreviewPanel`. |

## Component Grouping

- `TemplatesView` - route controller and route-local command state.
- `TemplatesRouteWorkbench` - route slot renderer and state branching.
- `TemplateMonacoPreviewPanel` - ready-preview presentation adapter.
- `templatesViewModel` - catalog, validation, and deterministic generation.
- `MonacoCodeViewer` - shared lazy read-only Monaco gateway.

## Repetitions

Diff, Artifacts, and Templates all need Monaco, but not the same panel:

- Diff owns comparison documents and uses `MonacoDiffViewer`.
- Artifacts owns structured JSON payload inspection.
- Templates owns generated source preview.

The repetition belongs in the shared Monaco gateway, not in a generic route
panel that erases bounded-context semantics.

## Code And Documentation Drift

F-21 intentionally shipped a basic preview to avoid coupling route creation to
Monaco. After F-21 merged, F-17's Templates leg became actionable. The drift is
now closed by documenting and testing the Templates-specific Monaco boundary.

## Opportunities

1. Make generated source review feel consistent with Diff and Artifacts.
2. Keep Templates free of fake export/apply commands until rails exist.
3. Provide a reusable example for future generated-source views without
   creating a generic template engine.

## Applied Patterns

- Extract Component for `TemplateMonacoPreviewPanel`.
- Gateway for `MonacoCodeViewer`.
- Presentation Model for `ExecutionTemplatePreviewProjection`.
- Semantic Fitness Function for route ownership and no-command posture.

## Lessons For Future Work

- A code viewer should not imply command authority.
- Route-level generated source needs semantic ownership before visual polish.
- F-17 should close by proving each Monaco route leg separately, then checking
  bundle and lazy-loading posture.

## ADR Decision

No new ADR is required. The accepted Monaco rationale already covers Templates
as an embedded review surface. This slice implements that decision without
changing contracts, adapters, persistence, or provider execution.
