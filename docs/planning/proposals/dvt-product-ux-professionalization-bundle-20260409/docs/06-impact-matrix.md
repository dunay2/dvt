# 06. Impact Matrix

The detailed matrix lives in:

- `data/component-impact-matrix.csv`

This page explains how to use that matrix as a delivery aid for the active UX
professionalization slices.

## 6.1. How To Read The Matrix

Each row captures:

- surface or component type;
- affected routes or files;
- observed problem;
- recommended action;
- rationale;
- priority;
- plugin impact;
- visual impact;
- interaction impact.

## 6.2. Highest-Priority Surfaces

| Priority  | Surfaces                                                                                                                                                                                                  | Why they matter first                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Very high | `Root.tsx`, `TopAppBar.tsx`, `LeftNavigation.tsx`, `CanvasShell.tsx`, `CanvasToolbar.tsx`, `CanvasViewport.tsx`, `styles/index.css`, `styles/theme.css`, `MonacoCodeSurface.tsx`, `MonacoDiffSurface.tsx` | These surfaces define shell grammar, route chrome, token ownership, and review-surface cohesion. |
| High      | `RunsView.tsx`, `Console.tsx`, `ArtifactsView.tsx`, `PluginsView.tsx`, `PluginManifest.ts`, `dbtContributions.ts`, `monitoringContributions.ts`, `uiLayoutStore.ts`, `sessionStore.ts`                    | These surfaces determine density, plugin posture, and route-to-shell coordination.               |
| Medium    | `AdminView.tsx`, `MonacoViewerFallback.tsx`, `canvasInteractionStore.ts`, `ViewHeader.tsx`                                                                                                                | These are important, but they depend on shell and token posture landing first.                   |

## 6.3. Fast Diagnosis

### Shell

The shell already exists, but its chrome and route framing still need stronger
governance.

### Canvas

Canvas is the strongest current product surface, but it still mixes local
styling, legacy seams, and incomplete workbench framing.

### Monaco

Monaco should feel like part of the workbench rather than a visually detached
island.

### Runs, Plugins, And Admin

These routes need higher density and clearer split-surface posture instead of
card-heavy composition.

### State And Layout

State direction is improving, but the repo still shows unresolved coupling
between runtime mode, shell layout, and tab ownership.

## 6.4. Delivery Use

Use the matrix as the shared cut line between:

- product direction;
- UX design;
- frontend implementation;
- plugin-governance work.

Specifically:

- `F-24` uses it to prioritize token convergence and route-chrome cleanup;
- `F-25` uses it to identify where plugin-owned surfaces need governed docking
  rather than local chrome;
- downstream implementation slices should treat it as an implementation aid,
  not as the canonical task registry.

## 6.5. Summary

The matrix is valuable because it turns abstract UX concerns into a concrete
impact order.

It should guide sequencing, but Lane E remains the source of task truth.
