---
title: Iconography And Design Tokens Contract
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-04
planning_type: architecture
---

# Iconography And Design Tokens Contract

## Purpose

This document fixes the visual base contract for the DVT operator workbench.

It exists to answer five implementation questions before more screens are built:

1. which icon family is standard;
2. which design-token layers the frontend must expose;
3. how the shell and shared components should look and feel;
4. which visual decisions are already locked for `Canvas`, `Runs`, `Diff`,
   `Artifacts`, and `Templates`;
5. which parts of the current frontend are reused versus replaced.

Use it with:

- [Workbench UI Contract And Component Inventory](./workbench-ui-contract-and-component-inventory.md)
- [Screen Layout And Cross-Surface Behavior Rules](./screen-layout-and-cross-surface-behavior-rules.md)
- [UX Implementation Guide](./ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](./library-and-open-source-reference-stack.md)

## Current Reality

The workbench already has a visual foundation, but it is not governed tightly
enough yet.

Current facts:

- the token source already exists in
  [`apps/web/src/styles/theme.css`](../../../../apps/web/src/styles/theme.css);
- the frontend already imports `lucide-react` broadly across shell, graph,
  runs, and route-level surfaces;
- `@mui/icons-material` is installed in
  [`apps/web/package.json`](../../../../apps/web/package.json), but there are no
  active product imports under `apps/web/src`;
- [`apps/web/src/styles/fonts.css`](../../../../apps/web/src/styles/fonts.css) is
  currently empty, so typography is not yet governed by an explicit contract;
- [`apps/web/src/styles/index.css`](../../../../apps/web/src/styles/index.css)
  still contains some route-specific hard-coded graph colors that should
  eventually fold into semantic tokens.

Decision:

- do not introduce a parallel design system;
- extend the existing theme token layer and make it semantic;
- standardize iconography now before more views diverge.

## Visual Direction

The operator workbench should feel like a mature control surface:

- dark-first and low-glare for long sessions;
- dense, but readable;
- operational, not decorative;
- coherent across routes without making every route look identical;
- clear about status, risk, and action priority.

It should not feel like:

- a purple-accent SaaS dashboard clone;
- a white-background CRUD admin;
- a collage of card grids;
- a freeform IDE where every surface gets equal visual weight.

Visual stance:

- `Canvas` is graph-first;
- `Runs` is evidence-first and can be denser;
- `Diff` and `Templates` are review-first and editor-adjacent;
- `Artifacts` is inspection-first and read-only by default.

## Token Architecture

The frontend token model should have four layers.

| Layer             | Role                                                             | Rule                                                            |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Foundation tokens | raw color families, spacing scale, radii, shadows, type families | may change in implementation without changing product semantics |
| Semantic tokens   | surfaces, text, borders, focus, status, charts, overlays         | authoritative contract for product UI                           |
| Component tokens  | toolbar height, panel padding, table row height, icon sizes      | should compose semantic tokens instead of raw values            |
| Route accents     | route-local emphasis when justified                              | may not redefine shell semantics or status semantics            |

Implementation rule:

- new UI code should consume semantic tokens;
- raw color values are allowed only inside the token source, not spread across
  route components.

## Foundation Palette

Raw palette values are an implementation seed, not the product contract by
themselves.

Preferred foundation families:

| Family   | Role                                               | Reference direction                        |
| -------- | -------------------------------------------------- | ------------------------------------------ |
| `ink`    | shell chrome, deep surfaces, graph background      | slate-blue neutrals rather than pure black |
| `steel`  | borders, dividers, muted panels, inactive controls | cool grey with enough contrast             |
| `cobalt` | primary accent and focus language                  | blue-first, not purple-first               |
| `green`  | success and healthy execution                      | status-only, not brand                     |
| `amber`  | warning, lag, partial availability                 | status-only                                |
| `red`    | failure and destructive intent                     | status-only                                |
| `sky`    | informational emphasis and read-only hints         | secondary accent, not primary brand        |

Reference palette seed:

| Token seed   | Reference value | Intended use                     |
| ------------ | --------------- | -------------------------------- |
| `ink-950`    | `#020617`       | app background                   |
| `ink-900`    | `#0b1220`       | shell and route surfaces         |
| `ink-800`    | `#121c2f`       | panels                           |
| `ink-700`    | `#17243c`       | elevated panels and hover        |
| `steel-500`  | `#4b5f84`       | strong borders                   |
| `steel-400`  | `#2f4368`       | default dark border              |
| `cobalt-500` | `#4f8cff`       | primary action                   |
| `cobalt-400` | `#60a5fa`       | focus ring and interactive hover |
| `green-500`  | `#22c55e`       | success                          |
| `amber-500`  | `#f59e0b`       | warning                          |
| `red-500`    | `#ef4444`       | failure                          |
| `sky-500`    | `#38bdf8`       | info and read-only cues          |

## Semantic Token Contract

These semantic groups should exist in the frontend token layer even if the
first implementation maps them onto the current variables in
`theme.css`.

### Surface tokens

| Token                | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `--surface-app`      | full-screen shell background               |
| `--surface-shell`    | top bar, left rail, bottom drawer chrome   |
| `--surface-route`    | default route background                   |
| `--surface-panel`    | explorer, inspector, side panels           |
| `--surface-elevated` | popover, dialog, raised cards              |
| `--surface-selected` | selected row, node, or nav item background |
| `--surface-overlay`  | overlay tint on graph and modal backdrops  |

### Text tokens

| Token             | Meaning                              |
| ----------------- | ------------------------------------ |
| `--text-strong`   | primary titles and important values  |
| `--text-default`  | normal body text                     |
| `--text-muted`    | secondary metadata                   |
| `--text-subtle`   | low-priority helper content          |
| `--text-inverse`  | text on brand or dark-emphasis fills |
| `--text-disabled` | disabled state only                  |

### Border and focus tokens

| Token              | Meaning                                     |
| ------------------ | ------------------------------------------- |
| `--border-subtle`  | dividers and low-emphasis separators        |
| `--border-default` | panel and input borders                     |
| `--border-strong`  | selected or emphasized frame                |
| `--focus-ring`     | keyboard focus and primary interaction halo |

### Status tokens

| Token               | Meaning                        |
| ------------------- | ------------------------------ |
| `--status-success`  | healthy, succeeded             |
| `--status-running`  | active execution               |
| `--status-warning`  | lag, stale, degraded           |
| `--status-danger`   | failed, destructive            |
| `--status-info`     | informational review cue       |
| `--status-offline`  | disconnected or unavailable    |
| `--status-readonly` | allowed to inspect, not mutate |

### Chart and graph tokens

| Token                    | Meaning                          |
| ------------------------ | -------------------------------- |
| `--chart-success`        | success series                   |
| `--chart-failure`        | failed series                    |
| `--chart-running`        | active series                    |
| `--graph-node-default`   | node baseline                    |
| `--graph-node-selected`  | node selected state              |
| `--graph-edge-default`   | default graph edge               |
| `--graph-edge-highlight` | focused lineage or diff emphasis |
| `--graph-grid`           | canvas background grid or guide  |

## Typography Contract

Typography must feel technical and operational, not marketing-heavy.

Approved type pair:

- UI and reading text: `IBM Plex Sans`
- code, SQL, IDs, hashes, metrics tables, and event streams: `IBM Plex Mono`

Rules:

- route titles use the UI family, not the mono family;
- code, SQL, artifact payloads, SHAs, and step identifiers use the mono family;
- do not hard-code ad hoc font stacks inside components;
- load and govern fonts through
  [`apps/web/src/styles/fonts.css`](../../../../apps/web/src/styles/fonts.css)
  and tokenized font-family variables.

Suggested type scale:

| Token            | Size / line-height | Typical use                   |
| ---------------- | ------------------ | ----------------------------- |
| `--text-display` | `28/34`            | rare page-level headline      |
| `--text-title`   | `20/28`            | route title                   |
| `--text-section` | `16/24`            | panel and table section title |
| `--text-body`    | `14/20`            | default UI body               |
| `--text-meta`    | `12/16`            | metadata, helper labels       |
| `--text-mono`    | `13/20`            | code, SQL, logs, identifiers  |

## Spacing, Radius, And Density

The workbench should use a tight but not cramped density model.

Rules:

- base spacing scale is `4px`;
- route toolbars, tables, and inspectors use compact spacing by default;
- padding should increase only for dialogs, onboarding, and empty states;
- rounded corners stay restrained; the product is not soft-card heavy.

Recommended component scale:

| Token or component    | Target size                           |
| --------------------- | ------------------------------------- |
| base spacing step     | `4px`                                 |
| shell top bar height  | `56px`                                |
| route toolbar height  | `44px`                                |
| panel header height   | `40px`                                |
| compact button height | `32px`                                |
| default button height | `36px`                                |
| table row height      | `36px` or `40px` depending on density |
| small radius          | `6px`                                 |
| default radius        | `10px`                                |
| large dialog radius   | `14px`                                |

Shadow rules:

- use one low-elevation shadow for overlays and popovers;
- do not stack multiple heavy shadows;
- depth should come mostly from surface contrast and borders, not from glow.

## Iconography Contract

### Standard pack

`lucide-react` is the standard product icon family.

Rules:

- new product UI must use `lucide-react`;
- do not introduce new icon packs for first-party product UI;
- `@mui/icons-material` is legacy inventory only and should not expand;
- if a touched surface still uses a non-standard icon pack later, migrate it
  instead of mixing styles in the same feature.

### Wrapper rule

All product icons should flow through a small wrapper such as `AppIcon`.

`AppIcon` should own:

- size presets;
- stroke width;
- semantic color application;
- disabled and active-state treatment;
- accessible `aria-hidden` defaults and label handoff.

### Size and stroke rules

| Token     | Size   | Use                            |
| --------- | ------ | ------------------------------ |
| `icon-xs` | `14px` | inline metadata                |
| `icon-sm` | `16px` | dense tables, chips            |
| `icon-md` | `18px` | default buttons and toolbars   |
| `icon-lg` | `20px` | nav items and panel headers    |
| `icon-xl` | `24px` | empty states and hero callouts |

Default stroke rule:

- use a consistent stroke close to `1.75` to `2`;
- do not mix thin outline icons with filled or heavy icons in the same surface.

### Usage rules

| Pattern                   | Rule                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| Left navigation           | icon plus label                                                      |
| Primary route actions     | icon plus label unless the label is already adjacent in the layout   |
| Secondary toolbar actions | icon-only allowed with tooltip                                       |
| Status chips              | icon optional; if used, keep icon stable by status meaning           |
| Empty states              | larger icon allowed, but one icon only                               |
| Tables                    | do not add decorative icons in every cell unless they encode meaning |

### Semantic icon registry

These meanings should stay stable across the product.

#### Route icons

| Route       | Standard icon |
| ----------- | ------------- |
| `Canvas`    | `GitBranch`   |
| `Runs`      | `Activity`    |
| `Lineage`   | `GitGraph`    |
| `Diff`      | `GitCompare`  |
| `Artifacts` | `FileText`    |
| `Templates` | `Code`        |
| `Plugins`   | `Puzzle`      |
| `Admin`     | `Shield`      |

#### Status icons

| State               | Standard icon   |
| ------------------- | --------------- |
| healthy or success  | `CheckCircle2`  |
| failed              | `XCircle`       |
| degraded or warning | `AlertTriangle` |
| running             | `Activity`      |
| queued              | `Clock`         |
| paused              | `Pause`         |
| offline             | `WifiOff`       |
| read-only           | `Lock`          |

#### Action icons

| Action   | Standard icon    |
| -------- | ---------------- |
| add      | `Plus`           |
| delete   | `Trash2`         |
| run      | `Play`           |
| stop     | `StopCircle`     |
| compare  | `GitCompare`     |
| inspect  | `PanelRightOpen` |
| explorer | `PanelLeftOpen`  |
| import   | `Upload`         |
| export   | `Download`       |
| filter   | `Filter`         |
| search   | `Search`         |

Registry rule:

- route, status, and plugin icons should be declared centrally;
- node-kind icons should live in node or plugin registries, not as ad hoc
  imports scattered through route components.

## Shared Component Visual Rules

### Shell chrome

| Surface       | Visual rule                                                                |
| ------------- | -------------------------------------------------------------------------- |
| top bar       | darkest stable chrome, quiet borders, global context only                  |
| left rail     | slightly separated from route surface, clear active state, icon plus label |
| health banner | status-first, compact, never a decorative announcement bar                 |
| bottom drawer | same shell family, not a second route navigation                           |

### Route chrome

| Surface         | Visual rule                                                  |
| --------------- | ------------------------------------------------------------ |
| route toolbar   | compact, horizontal, command-first                           |
| context panels  | stable frame, clear headers, independent scroll              |
| primary surface | dominant visual area, minimal ornament                       |
| dialogs         | used only for confirmation, import, or explicit review gates |

### Data-heavy components

| Component    | Visual rule                                                       |
| ------------ | ----------------------------------------------------------------- |
| tables       | sticky headers, compact rows, status tokens over decorative color |
| cards        | summary only; not the default grammar for dense operational views |
| badges       | low-chroma fills and clear label contrast                         |
| tabs         | route-local segmentation, not top-level navigation                |
| empty states | concise guidance, one icon, one next action                       |

### Editor-adjacent components

| Surface                 | Visual rule                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| SQL preview in `Canvas` | read-only, secondary, visually subordinate to the graph            |
| `Diff` panes            | monospace-first, high contrast, summary before raw delta           |
| `Artifacts` viewers     | read-only inspection, structured search, no edit affordance        |
| `Templates` preview     | editor-grade preview and diff, but still wrapped in route controls |

## Motion And Interaction Tone

Motion should be restrained and purposeful.

Rules:

- use short transitions in the `120ms` to `180ms` range for panel open, hover,
  and selection feedback;
- avoid decorative floating or bounce effects in the operator workbench;
- use stronger motion only for route changes, panel recovery, and explicit run
  feedback;
- use color and border changes before using animation to communicate state.

## Accessibility And Contrast Rules

Visual maturity is not an excuse for low legibility.

Rules:

- color alone must not carry critical status;
- icon-only controls require accessible labels and tooltip support;
- focus ring must remain visible on dark surfaces;
- muted text must still be readable in panels and dense tables;
- graph overlays, diff highlights, and status chips must stay distinguishable
  under color-vision variation.

## Implementation Rules For `apps/web`

This contract should land through the existing style system, not beside it.

Implementation rules:

1. keep
   [`apps/web/src/styles/theme.css`](../../../../apps/web/src/styles/theme.css)
   as the canonical token source;
2. add semantic token names there instead of route-level hard-coded values;
3. keep
   [`apps/web/src/styles/fonts.css`](../../../../apps/web/src/styles/fonts.css)
   as the font-loading and font-token source;
4. use Tailwind aliases or utility helpers that resolve to semantic CSS
   variables;
5. reduce hard-coded graph colors in
   [`apps/web/src/styles/index.css`](../../../../apps/web/src/styles/index.css)
   over time in favor of tokenized values;
6. do not create a second theme runtime inside React state or component props.

## Immediate Decisions Locked By This Document

1. `lucide-react` is the standard icon family for first-party product UI.
2. `@mui/icons-material` is not approved for new product UI work.
3. The primary visual accent is blue-first, not purple-first.
4. The operator workbench is dark-first and low-glare by default.
5. Typography is technical and operational, with `IBM Plex Sans` plus
   `IBM Plex Mono` as the approved pair.
6. The product uses semantic tokens in the existing theme layer instead of
   scattered raw values.
7. Cards are a supporting summary pattern, not the dominant grammar for dense
   workbench routes.
8. `Canvas`, `Runs`, `Diff`, `Artifacts`, and `Templates` share one visual
   family, with density differences driven by job-to-be-done rather than by
   ad hoc route styling.
