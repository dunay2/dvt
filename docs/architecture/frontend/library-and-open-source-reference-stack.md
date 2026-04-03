---
title: Library And Open-Source Reference Stack
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-03
---

# Library And Open-Source Reference Stack

This page records the mature libraries and open-source product references that
the DVT frontend should build on instead of re-implementing from scratch.

It also records named design references that are not libraries but still guide
product UX decisions.

## Selection Rules

- prefer libraries that solve complex interaction, accessibility, or rendering
  problems better than an in-house implementation would;
- prefer headless libraries when DVT needs its own visual language;
- wrap third-party primitives behind DVT adapters when they affect core product
  concepts such as graph models, diff surfaces, or editor models;
- use open-source products as design and interaction precedents;
- do not vendor code from third-party projects without explicit license review.

## Recommended Library Stack

| Area                         | Recommended library                                         | Why it fits DVT                                                                                   |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Graph canvas                 | [React Flow](https://reactflow.dev/)                        | Mature node-based editor primitives, built-in viewport, minimap, controls, custom nodes and edges |
| Server state                 | TanStack Query                                              | Stable query, cache, polling, and invalidation model for backend-backed views                     |
| Local UI state               | Zustand                                                     | Small and explicit UI-state store for shell and view-local behavior                               |
| Base primitives              | [Radix Primitives](https://www.radix-ui.com/primitives)     | Accessible unstyled React primitives for dialogs, menus, tabs, scroll areas, and focus management |
| Design-system layer          | [shadcn/ui](https://ui.shadcn.com/)                         | Open-code component recipes on top of Radix and Tailwind                                          |
| Dense data tables            | [TanStack Table](https://tanstack.com/table/latest)         | Headless tables for runs, events, artifacts, and diagnostics grids                                |
| Code and diff editors        | [Monaco Editor](https://github.com/microsoft/monaco-editor) | Mature editor model, diff editor, and syntax-aware UX                                             |
| Terminal or live log console | [xterm.js](https://xtermjs.org/)                            | Mature browser terminal and streaming console surface                                             |
| Charts                       | Recharts today                                              | Already used in the codebase for quick metrics and cost views                                     |

## Open-Source Product References

| Product                                             | Use it for                                                                | Do not copy blindly                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [VS Code](https://github.com/microsoft/vscode)      | shell grammar, docked workbench patterns, tab-and-panel behavior          | internal extension model, build system, or product-specific shell logic |
| [Grafana](https://github.com/grafana/grafana)       | observability dashboards, drill-down patterns, panel composition          | data-source model or product taxonomy that does not match DVT           |
| [Backstage](https://github.com/backstage/backstage) | plugin-oriented frontend composition and route-level capability discovery | developer-portal assumptions that do not fit DVT's workbench            |

## Design References

| Reference | Use it for                                                                 | What it is not                                         |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `Marquez` | named visual and narrative direction for open-data or public-data surfaces | not a library, framework, or component runtime         |
| VS Code   | operator-workbench shell grammar                                           | not DVT's visual theme for every surface               |
| Grafana   | operational density and observability drill-down                           | not the presentation model for public explanatory data |

## Current Fit Against The Codebase

- `apps/web` already uses `@xyflow/react`, TanStack Query, Zustand, Radix-based
  components, Tailwind, and Recharts.
- The missing step is not choosing a new stack from scratch. It is documenting
  where each library is allowed to own complexity and where DVT must keep its
  own domain model.
- Monaco and xterm.js are not active shell primitives yet, but they are the
  right maturity targets for code, diff, and console surfaces.
