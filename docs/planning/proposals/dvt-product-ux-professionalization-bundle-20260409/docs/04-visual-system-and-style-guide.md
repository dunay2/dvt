# 04. Visual System And Style Guide

This document defines the proposal-level visual direction for the DVT operator
workbench.

Its purpose is not to introduce a second token system. Its purpose is to define
how the existing semantic token posture in `apps/web/src/styles/theme.css`
should become the real owner of shell and route visuals.

## 4.1. Design Direction

The correct direction is not "more effect". It is:

- more signal;
- stronger hierarchy;
- calmer surfaces;
- better density;
- clearer state readability.

The product should read like an operator workbench, not a glossy dashboard.

## 4.2. Core Principles

1. Quiet surfaces
   Backgrounds should never compete with the work itself.
2. Strong hierarchy
   Primary actions, route identity, and state should win visually before
   decorative detail.
3. Operational density
   Dense is acceptable when structure is explicit and repeatable.
4. Consistency over flair
   Shared primitives matter more than route-level styling tricks.
5. One accent, many semantics
   Brand accent is limited; health and state semantics must stay explicit.

## 4.3. Token Posture

Token ownership should stay here:

- semantic surface, text, border, focus, and state tokens live in
  `theme.css`;
- route-level components consume semantic tokens or shared class tokens;
- dense surfaces reuse workbench primitives instead of inventing local color
  language.

Token ownership should not stay here:

- route-local `slate-*` and hard-coded hex values in main workbench surfaces;
- inline visual styles except where geometry is truly dynamic;
- Monaco or React Flow themes that feel detached from the shell.

## 4.4. Typography

UI stack baseline:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Monospace baseline:

```css
"JetBrains Mono", "SFMono-Regular", ui-monospace, Consolas, monospace
```

Alternative industrial posture, if approved later:

```css
"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif
"IBM Plex Mono", ui-monospace, monospace
```

Typography is secondary to token convergence. Font swaps should not be treated
as the first step.

## 4.5. Spacing And Structural Rhythm

Recommended spacing rhythm:

- `4px` micro spacing
- `8px` operational spacing
- `12px` close grouping
- `16px` standard separation
- `24px` block separation
- `32px` section separation

Suggested shell dimensions:

- top bar: `44px`
- activity rail: `60px`
- route header: `56px`
- local toolbar: `40px`
- right inspector: `360px` baseline
- bottom diagnostics: `240px` expanded baseline

## 4.6. Density Modes

Two density modes are enough for the first governed slice:

- `comfortable`
- `compact`

Use `comfortable` for:

- demos;
- onboarding;
- broad explanatory routes.

Use `compact` for:

- runs;
- plugins;
- admin;
- dense inspector or review surfaces.

Do not introduce an ultra-compact mode before the first two are stable.

## 4.7. Surface Rules

### Shell

- reduce decorative gradients;
- keep chrome readable and restrained;
- make global status visible without becoming visually loud.

### Canvas

- make the grid quieter;
- keep React Flow controls utilitarian rather than ornamental;
- treat overlays as data layers, not as theme experiments.

### Dense Data Routes

- use flatter backgrounds;
- keep headers, filters, and table rhythm explicit;
- avoid stacked card noise where tables or split panes fit better.

### Monaco

- reuse the same surface and text semantics as the workbench;
- keep monospace consistent with the rest of the product;
- avoid making Monaco feel like a foreign product embedded inside DVT.

### React Flow

- apply the same border, panel, and focus language as the shell;
- tokenized controls and minimap only;
- node and edge styling should reflect product semantics, not demo styling.

## 4.8. Motion

Use motion only where it clarifies structure:

- panel open and close;
- resize transitions;
- focus changes;
- small loading indicators.

Avoid:

- decorative animations;
- slow transitions on core work surfaces;
- motion that competes with runtime state or graph reading.

## 4.9. Required UX States

Every main route should present these states clearly:

- loading
- empty
- degraded
- offline
- read-only

These states should use shared semantic treatment, not route-specific visual
inventiveness.

## 4.10. Migration Priorities

Highest-value cleanup targets:

- shell chrome and top bar wrappers;
- shared route header and route frame primitives;
- Canvas surface hardcodes and React Flow controls;
- Runs, Plugins, and Admin dense-surface styling;
- Monaco fallback and review surfaces.

## 4.11. Summary

The visual-system problem is not a color-refresh problem.

It is a convergence problem:

- move visual authority back into semantic tokens;
- remove route-level hardcodes from core surfaces;
- define density intentionally;
- make Canvas, Monaco, and dense routes feel like one governed product.
