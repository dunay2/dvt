---
title: UI / Visualization Domain
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-03
---

# UI / Visualization Domain

This domain owns the browser-facing DVT experience.

The code lives in the `apps/web` workspace, whose package name is `@dvt/web`.

## Scope

- `apps/web`
- package surface `@dvt/web`
- frontend routing, shell, graph workbench, runs, lineage, diff, artifacts, and
  platform health
- future execution-template and source-generation workbenches

## Current Responsibilities

- bootstrap the browser app and route operators through the current shell;
- render the active workbench views;
- present platform-health state and execution-facing UX;
- model governed source-generation UX for execution templates and provider
  scaffolds without becoming the execution authority;
- keep client composition separate from execution, planner, and persistence
  authority.

## Mature Library And OSS Direction

- [React Flow](https://reactflow.dev/) for node-based graph interaction;
- TanStack Query for server-state and polling;
- Zustand for focused local UI state;
- [Radix Primitives](https://www.radix-ui.com/primitives) and
  [shadcn/ui](https://ui.shadcn.com/) for accessible shell and view primitives;
- [TanStack Table](https://tanstack.com/table/latest) for dense diagnostics and
  operational tables;
- [Monaco Editor](https://github.com/microsoft/monaco-editor) for future code
  and diff panes;
- [xterm.js](https://xtermjs.org/) for future console or streamed log surfaces.

Open-source product references:

- [VS Code](https://github.com/microsoft/vscode)
- [Grafana](https://github.com/grafana/grafana)
- [Backstage](https://github.com/backstage/backstage)

## Related Pages

- [Frontend Architecture](./components/web/index.md)
- [Frontend Data-Boundary Architecture](./components/web/frontend-data-boundary-architecture.md)
- [Frontend Fowler Implementation Pattern](./components/web/frontend-fowler-implementation-pattern.md)
- [Frontend Runtime Modes User Manual](./components/web/frontend-runtime-modes-user-manual.md)
- [Frontend Runtime Contract Technical Manual](./components/web/runs/frontend-runtime-contract-technical-manual.md)
- [Frontend Runtime Contract User Manual](./components/web/runs/frontend-runtime-contract-user-manual.md)
- [Main Workspace Views And UX](./components/web/main-workspace-views-and-ux.md)
- [UX Implementation Guide](./components/web/ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](./components/web/library-and-open-source-reference-stack.md)
