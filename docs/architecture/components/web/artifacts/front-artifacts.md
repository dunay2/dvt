---
title: Frontend Artifacts
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-03
category: frontend-architecture
---

# Frontend Artifacts

## Purpose

This page defines the real frontend artifacts that make up the DVT workbench
today and the mature implementation direction for each one.

## Active Artifacts

| Artifact                   | Current implementation                                             | Current maturity     |
| -------------------------- | ------------------------------------------------------------------ | -------------------- |
| App Shell                  | `App.tsx`, `Root.tsx`, `TopAppBar.tsx`, `LeftNavigation.tsx`       | Real and active      |
| Workspace / Main workbench | route outlet plus Canvas, Runs, Lineage, Diff, and Artifacts views | Real and active      |
| Graph workbench            | `Canvas.tsx`, `CanvasShell.tsx`, `useCanvasController.ts`          | Most mature route    |
| Inspector                  | `InspectorPanel.tsx` plus plugin tabs                              | Real, node-centric   |
| Runs workbench             | `RunsView.tsx` and tabbed run detail                               | Real, growing        |
| Lineage surface            | `LineageView.tsx`                                                  | Real, read-only      |
| Diff surface               | `DiffView.tsx`                                                     | Real, still early    |
| Artifact browser           | `ArtifactsView.tsx`                                                | Real, read-only      |
| Observability              | shell health plus Runs metrics                                     | Real but distributed |

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
