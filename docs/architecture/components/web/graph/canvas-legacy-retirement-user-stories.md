---
title: Canvas Legacy Retirement User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-18
planning_type: architecture
---

# Canvas Legacy Retirement User Stories

## Purpose

Capture F-12 scenarios for retiring the old `GraphCanvas.tsx` path and keeping
the active Canvas graph stack singular.

## User Stories

### US-CANVAS-LEGACY-001 - Retired Renderer Stays Removed

As a maintainer, I can inspect active source and see that
`apps/web/src/app/components/GraphCanvas.tsx` does not exist, so there is no
second graph renderer competing with `CanvasShell`.

Acceptance:

- active source has no `GraphCanvas.tsx` file;
- architecture tests fail if the file returns;
- archived references do not count as active source.

### US-CANVAS-LEGACY-002 - Graph Tab Uses Current Vocabulary

As a reviewer, I can read the Graph tab factory name and understand it creates
the Canvas Graph tab, not a retired GraphCanvas component.

Acceptance:

- active API is `createCanvasGraphWorkbenchTab`;
- `createGraphCanvasWorkbenchTab` is absent from active source;
- the returned read model still resolves `id: 'graph'` to `/canvas`.

### US-CANVAS-LEGACY-003 - Active Stack Is Documented

As a new frontend contributor, I can open component docs and see the current
Canvas route stack: `Canvas.tsx`, `CanvasShell`, `useCanvasController`, and the
plugin graph strategy registry.

Acceptance:

- component docs contain public API, invariants, transitions, consumers, and a
  Mermaid diagram;
- docs explicitly name `GraphCanvas.tsx` as retired;
- docs do not describe the retired renderer as current ownership.

### US-CANVAS-LEGACY-004 - Semantic Guard Prevents Regression

As an architecture reviewer, I can rely on tests that validate semantic
retirement, not only that a barrel file is thin.

Acceptance:

- architecture tests check the active API name;
- architecture tests check active route composition;
- architecture tests check documentation and mailbox analysis surfaces.

## Scenario Matrix

| Scenario              | Positive path                                | Negative path                      | Proof                                 |
| --------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------- |
| Renderer retirement   | `GraphCanvas.tsx` absent                     | file reappears                     | architecture test                     |
| Graph tab projection  | `createCanvasGraphWorkbenchTab` builds Graph | old factory name returns           | unit and architecture tests           |
| Route composition     | `Canvas.tsx` builds `CanvasShell` props      | route imports retired renderer     | route architecture test               |
| Documentation closure | active stack documented                      | docs describe retired path as live | component guide and architecture test |
