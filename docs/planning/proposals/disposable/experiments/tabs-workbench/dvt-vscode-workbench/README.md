# DVT workbench layer aligned to `dunay2/dvt`

This bundle adds a VS Code-like workbench **on top of the existing `apps/web` canvas route** instead of replacing the whole shell.

## Why this shape fits the repo

The public repo already has the right base:

- monorepo structure with `apps/web`
- React + Vite frontend package
- Tailwind enabled
- Zustand app state
- `react-resizable-panels`
- React Flow canvas
- a shell with `TopAppBar`, `LeftNavigation`, `Console`, inspector, and plugin-contributed routes

Because of that, the safest upgrade is:

1. Keep `Root.tsx`, `TopAppBar`, `LeftNavigation`, `Console`, plugins and routes.
2. Replace only the current `Canvas.tsx` view with a richer workbench.
3. Add Monaco for code, artifacts and diffs.
4. Reuse `useCanvasController`, `CanvasToolbar`, `CanvasViewport`, `InspectorPanel`, and existing persisted shell state.

## What this bundle adds

- editor tabs with close/activate behavior
- Monaco editor surface for SQL / JSON / YAML / logs
- Monaco diff editor for node SQL diffs
- command palette with:
  - `Ctrl/Cmd + P` quick open
  - `Ctrl/Cmd + Shift + P` commands
- VS Code-like left content sidebar inside the canvas view
- status bar for active tab / branch / tenant / env context
- artifact tabs for:
  - `manifest.json`
  - `catalog.json`
  - `plan.json`
  - `run_results.json`

## Intended integration path

1. Add the Monaco dependencies from `apps/web/package.monaco.patch.diff`.
2. Copy the new files under `apps/web/src/app/views/canvas/`.
3. Replace `apps/web/src/app/views/Canvas.tsx` with the version from this bundle.
4. Keep `Root.tsx` as-is; it already provides the global shell.
5. Later, replace the generated artifact builders with real backend payloads.

## Notes

- This layer keeps the repo's current **graph-first** product model.
- The graph tab remains the default editor tab.
- Explorer items open real editor tabs instead of using a fake static mock.
- Artifact payloads are still generated from the current in-memory graph/controller data until the planned API paths are wired.
