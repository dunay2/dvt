---
title: 00 Executive Summary
status: Draft
owner: Product / UX / Frontend
last_reviewed: 2026-04-17
planning_type: proposal
---

# 00. Executive Summary

## Recommended Positioning

DVT should not present itself as "another dark technical dashboard." It should
present itself as an **operational workbench for designing, running,
inspecting, and extending workflows**.

That positioning changes several product decisions:

1. **The shell owns the product grammar.**
   Navigation, persistent state, and core panels should behave like a stable
   product language, not like route-by-route accidents.
2. **Canvas is central, but not the only surface.**
   The graph must coexist with code, diff, artifacts, and monitoring inside a
   single workbench experience.
3. **The top bar cannot become a junk drawer.**
   Identity, workspace selection, connection status, and layout controls should
   not compete for the same visual zone.
4. **Primary navigation must group tasks, not subtools.**
   `Canvas`, `Runs`, and `Lineage` fit as core operator tasks. `Code`, `Diff`,
   and much of `Artifacts` fit better as contextual workbench surfaces.
5. **Density must increase without losing order.**
   Operational views should prefer tables, splits, stable headers, and governed
   panels instead of ad hoc cards and mixed visual treatments.
6. **Plugins need governed docks.**
   The repo already has strong plugin-contribution primitives. The missing step
   is a visual and operational contract that makes extensions feel native.

## Most Important Product Decision

The correct direction is:

**Persistent shell + activity rail + route header + contextual workbench +
inspector + diagnostics panel**

and not:

**each route shipping its own disconnected mini-UI**

## Critical Recommendations

### A. Simplify core navigation

Keep as primary:

- `Canvas`
- `Runs`
- `Lineage`

Reposition:

- `Code`
- `Diff`
- `Artifacts`

These views should remain available, but increasingly as:

- workbench tabs,
- node- or run-derived contextual surfaces,
- or secondary routes instead of shell-defining destinations.

### B. Detox the top bar

The top bar should focus on:

- brand and workspace context,
- global health,
- quick switching and command palette,
- shell-level actions.

It should not absorb every density toggle and route-local control.

### C. Turn the bottom panel into a diagnostics workspace

`Console` is a useful base, but too narrow. The target should be a governed
bottom panel with tabs such as:

- Events
- Logs
- Problems
- Output

### D. Reduce visual noise

The product already has semantic tokens in `theme.css`, but several surfaces
still rely on decorative gradients, direct `slate-*` utilities, and hard-coded
colors. The direction should be:

- less decoration,
- lower brightness,
- stronger hierarchy,
- more consistency.

### E. Structure large boards better

Large-graph work needs more than pan and zoom. The workbench should add:

- saved views,
- frames or named zones,
- persistent filters,
- quick switching,
- command palette support,
- task-context restoration.

## What I Would Do First

### First block: fast, high-return

- standard route header
- top-bar cleanup
- shell visual simplification
- hard-code tokenization
- upgraded bottom diagnostics grammar
- productized `PluginsView`

### Second block

- real workbench tabs in Canvas
- `Code`, `Diff`, and `Artifacts` opened from context
- DVT Monaco theme alignment
- denser and more analytical `Runs`

### Third block

- governed plugin UX contract
- command palette
- saved views, frames, and quick open
- future step-kind plugins and source-generation workbenches

## Expected Result

If executed well, DVT should feel:

- more professional,
- faster to operate,
- more ordered for repeat users and power users,
- clearer in demos and product storytelling,
- and much better prepared to grow through plugins without losing coherence.
