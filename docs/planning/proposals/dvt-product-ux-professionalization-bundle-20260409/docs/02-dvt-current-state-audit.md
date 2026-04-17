---
title: 02 DVT Current-State Audit
status: Draft
owner: Product / UX / Frontend
last_reviewed: 2026-04-17
planning_type: proposal
---

# 02. DVT Current-State Audit (real repo)

## 2.1. What is already pointing in the right direction

### Persistent shell

The base structure already points in the right direction:

- `Root.tsx`
- `TopAppBar.tsx`
- `LeftNavigation.tsx`
- `Console.tsx`
- `ShellHealthBanner.tsx`

That is already a workbench shell baseline and is stronger than a collection of
isolated screens.

### Real plugin capability

The frontend is not improvising plugins:

- `app/plugins/contracts/PluginManifest.ts`
- `app/plugins/registry.ts`
- `app/shell/useShellRuntime.ts`
- `app/routes.ts`

The system already supports:

- views,
- navigation,
- toolbar contributions,
- inspector panels,
- overlays,
- badges,
- `produces` / `consumes` ports.

That is a meaningful asset and should be protected.

### Canvas as product nucleus

The Canvas route already rests on:

- `views/Canvas.tsx`
- `views/canvas/CanvasShell.tsx`
- `views/canvas/CanvasToolbar.tsx`
- `views/canvas/CanvasViewport.tsx`

The left panels plus viewport composition is already a solid starting point.

### Monaco already exists

This is not a future abstraction. The repo already has:

- `components/monaco/monacoCodeSurface.tsx`
- `components/monaco/monacoDiffSurface.tsx`
- `components/monaco/monacoViewerFallback.tsx`
- `views/CodeView.tsx`
- `views/DiffView.tsx`

The work is not "add an editor." The work is **integrate it correctly**.

## 2.2. Product and UX problems detected

### A. Route fragmentation

The repo still creates too much separation between:

- Canvas
- Lineage
- Code
- Diff
- Runs
- Artifacts

That is technically valid, but from a UX standpoint it breaks a flow that
should feel continuous:

1. inspect the node,
2. review details,
3. compare,
4. execute,
5. monitor.

### B. Top bar overload

`TopAppBar.tsx` and `topAppBar/TopAppBarShellMenu.tsx` currently mix:

- workspace context,
- connection status,
- git ref,
- explorer / inspector / console toggles,
- focus mode,
- grid size.

Conclusion:

- too much global control is concentrated in one strip;
- some of that belongs closer to Canvas or to a route-local toolbar.

### C. Visual noise is still too high

Even with a good token baseline in `styles/theme.css`, there are still
hard-coded treatments and heavy decoration in:

- `styles/index.css`
- `views/canvas/CanvasViewport.tsx`
- `views/ArtifactsView.tsx`
- `components/Console.tsx`
- `components/monaco/monacoViewerFallback.tsx`
- many `bg-slate-*` and `text-slate-*` utility chains

That creates:

- too many competing surface treatments,
- weaker hierarchy,
- a stronger "prototype dark UI" feeling than "operational product."

### D. The bottom panel is useful but too narrow

`Console.tsx` solves a real need, but as a product experience:

- it is too tightly bound to the word "console,"
- it does not cover events, problems, outputs, and runtime detail well,
- and API mode already admits that streaming is unavailable.

The right direction is a governed diagnostics tray.

### E. Large boards still need real structure

`CanvasViewport.tsx` already has minimap and grid, but that is not enough for
large graphs. Missing capabilities include:

- zones or frames,
- saved views,
- quick focus,
- bookmarks,
- filter presets,
- restoration of task context.

### F. Density is not standardized

Some views still look like "screens assembled from blocks" rather than
"operational surfaces." This affects especially:

- Runs
- Plugins
- Admin
- Artifacts
- Diff

### G. Plugin visuals still lack a product grammar

The technical extension system already exists, but the product still needs
rules such as:

- what can enter the top bar,
- what belongs in the route header,
- what belongs in the local toolbar,
- what belongs in the inspector,
- what belongs in the bottom panel,
- what must never appear as arbitrary plugin chrome.

## 2.3. Clear opportunities

### Opportunity 1: unify shell and workbench

The repo already has enough structure to become one coherent work experience.

### Opportunity 2: turn plugins into a product advantage

Many products this size do not already have this much extension infrastructure
for views and overlays.

### Opportunity 3: professionalize without a rewrite

`apps/web` does not need a full rebuild. The biggest gain comes from:

- grammar,
- simplification,
- tokenization,
- density,
- and an ordered relationship between surfaces.

## 2.4. Surface-specific findings

### Root shell

**Files**

- `app/Root.tsx`
- `app/components/TopAppBar.tsx`
- `app/components/LeftNavigation.tsx`
- `app/components/Console.tsx`

**Reading**
Strong workbench base.

**Problem**
It still needs cleaner separation between:

- navigation,
- local action,
- contextual status,
- diagnostics.

### Canvas

**Files**

- `app/views/Canvas.tsx`
- `app/views/canvas/CanvasShell.tsx`
- `app/views/canvas/CanvasToolbar.tsx`
- `app/views/canvas/CanvasViewport.tsx`

**Reading**
This is the strongest current product surface.

**Problem**
It still feels more like a graph route than an operational workspace.

### Code / Diff / Artifacts

**Files**

- `app/views/CodeView.tsx`
- `app/views/DiffView.tsx`
- `app/views/ArtifactsView.tsx`
- `app/components/monaco/*`

**Reading**
Useful capabilities, but they still orbit as separate routes.

**Problem**
They should increasingly feel like contextual extensions of the workspace.

### Runs

**Files**

- `app/views/RunsView.tsx`
- `app/views/runs/*`

**Reading**
This should evolve into a dense operational cockpit.

### Plugins

**Files**

- `app/views/PluginsView.tsx`
- `app/plugins/registry.ts`
- `app/plugins/contracts/PluginManifest.ts`

**Reading**
Today it still feels closer to technical diagnostics than to extension
management as a product capability.

## 2.5. Verdict

DVT already has the minimum visual architecture required to become a
professional product. What it lacks is not more feature count. It lacks:

- more grammar,
- less fragmentation,
- more useful density,
- less noise,
- and an explicit policy for how the full experience fits together, including
  plugins.
