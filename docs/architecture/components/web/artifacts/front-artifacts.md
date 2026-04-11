---
title: Frontend Artifacts
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-11
category: frontend-architecture
---

# Frontend Artifacts

## Purpose

This page defines the real frontend artifacts that make up the DVT workbench
today and the mature implementation direction for each one.

## Active Artifacts

| Artifact                   | Current implementation                                                            | Current maturity           |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| App Shell                  | `App.tsx`, `Root.tsx`, `TopAppBar.tsx`, `LeftNavigation.tsx`                      | Real and active            |
| Workspace / Main workbench | route outlet plus Canvas, Runs, Lineage, Diff, and Artifacts views                | Real and active            |
| Graph workbench            | `Canvas.tsx`, `CanvasShell.tsx`, `useCanvasController.ts`                         | Most mature route          |
| Inspector                  | `InspectorPanel.tsx` plus plugin tabs                                             | Real, node-centric         |
| Runs workbench             | `RunsView.tsx` and tabbed run detail                                              | Real, growing              |
| Lineage surface            | `LineageView.tsx`                                                                 | Real, read-only            |
| Diff surface               | `DiffView.tsx`                                                                    | Real, still early          |
| Artifact browser           | `ArtifactsView.tsx`, `artifactsWorkbenchStateModel.ts`, `ArtifactsStateViews.tsx` | Real, state model explicit |
| Observability              | shell health plus Runs metrics                                                    | Real but distributed       |

## Route State Contract

`Artifacts` is a governed read-only workbench.

Its route contract is:

- `loading`: preserve the route frame while workspace artifacts resolve;
- `empty`: explain that no artifacts are loaded yet and keep local import available;
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
- [Main Workspace Views And UX](../main-workspace-views-and-ux.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
