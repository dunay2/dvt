# Repo alignment notes

## Verified repo surfaces this bundle aligns to

- `pnpm-workspace.yaml` already includes both `apps/*` and `packages/*`.
- `apps/web/package.json` already uses:
  - React 18
  - Vite
  - Tailwind
  - Zustand
  - `@tanstack/react-query`
  - `@xyflow/react`
  - `react-resizable-panels`
  - `lucide-react`
- `apps/web/README.md` already describes the product shell as:
  - top app bar
  - left navigation
  - VS Code-like dockable/resizable workspace
  - bottom console
- `src/app/Root.tsx` already composes:
  - `TopAppBar`
  - `LeftNavigation`
  - `Console`
  - route outlet
- `src/app/views/Canvas.tsx` already delegates to `useCanvasController`.
- `src/app/views/canvas/useCanvasController.ts` already centralizes:
  - graph snapshot loading
  - graph mutations
  - overlay state
  - plan/start-run actions
  - inspector selection
  - persisted viewport/node positions

## Why I did not replace the shell

Replacing `Root.tsx` would fight the current architecture.
The repo already has the correct shell boundary.
The missing piece is an editor-grade workspace inside the canvas route.

## What this workbench keeps

- current route model
- current plugin system
- current graph controller
- current app store toggles
- current modals for plan preview and edge confirmation

## What this workbench changes

- the center workspace becomes tab-based
- the graph becomes one editor tab rather than the entire page
- code/artifact/diff tabs use Monaco
- explorer/artifact/outline become a richer left content sidebar
- status bar becomes view-local and editor-aware
