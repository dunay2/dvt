---
title: Frontend Artifacts
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-08-02
category: frontend-architecture
---

# Frontend Artifacts

## Purpose

This page defines the real frontend artifacts that make up the DVT workbench
today and the mature implementation direction for each one.

## Active Artifacts

| Artifact                   | Current implementation                                                 | Current maturity             |
| -------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| App Shell                  | `App.tsx`, `Root.tsx`, `TopAppBar.tsx`                                 | Real and active              |
| Process Map                | `Canvas.tsx`, `CanvasShell.tsx`, `useCanvasController.ts`              | Primary product route        |
| Contextual Code            | Canvas Code workbench and revision-guarded workspace-file rails        | Real and editable            |
| Lineage lens               | Canvas impact and column-lineage overlays                              | Real and read-only           |
| Source Import              | contextual wizard plus warehouse connection and catalog API rails      | Real and API-backed          |
| Operational drawer         | Log, Problems, Runs, and typed Preview outcome panels                  | Real and contextual          |
| Runs workbench             | `RunsView.tsx` and tabbed run detail                                   | Real and growing             |
| Internal review primitives | Monaco code/diff viewers and artifact state models without peer routes | Retained implementation APIs |
| Observability              | shell health, node metrics, and Runs evidence                          | Real but distributed         |

## Route State Contract

Artifact payload readers are governed internal presentation primitives. Raven
does not expose an Artifacts peer route.

Their presentation contract is:

- `loading`: preserve the owning contextual surface while payloads resolve;
- `empty`: explain that no artifact payload is available;
- `error`: explain that workspace artifact loading failed without fabricating fallback payloads;
- `invalid import`: explain why a local `manifest.json` was rejected;
- `ready`: show only real imported or workspace-backed artifacts and previews.

Truthfulness rules:

- do not synthesize server artifact rows when the workspace has no artifacts;
- do not synthesize preview payloads for `manifest.json`, `run_results.json`, or `catalog.json`;
- if an artifact preview is unavailable, say so explicitly instead of rendering placeholder JSON;
- do not present fake Git SHA provenance for artifact payloads that do not carry real revision identity.

## Implementation Guidance

- use [React Flow](https://reactflow.dev/) for graph interaction;
- use [TanStack Table](https://tanstack.com/table/latest) when Runs, Events, or
  Diff outgrow cards;
- use [Monaco Editor](https://github.com/microsoft/monaco-editor) for future
  SQL, JSON, and diff panes;
- use [xterm.js](https://xtermjs.org/) for any future real console or streamed
  log surface;
- use [VS Code](https://github.com/microsoft/vscode) as the workbench shell
  reference and [Grafana](https://github.com/grafana/grafana) as the
  observability-pattern reference.

## Related Pages

- [Frontend Architecture](../index.md)
- [Screen Manuals And User Stories](../screen-manuals-and-user-stories.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
