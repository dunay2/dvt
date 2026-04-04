---
title: Top App Bar Component Technical Manual
status: Draft
date: 2026-04-04
owner: Web
planning_type: architecture
---

# Top App Bar Component Technical Manual

## Goal

Define the current technical shape of the top app bar so the UI stays modular,
multi-language ready, and style-consistent.

## Scope

- `apps/web/src/app/components/TopAppBar.tsx`
- `apps/web/src/app/components/topAppBar/*`

## Component Boundary

`TopAppBar.tsx` is a composition root only. It owns store wiring and delegates
rendering to small UI components:

- `TopAppBarWorkspaceSelectors`
- `TopAppBarGitRef`
- `TopAppBarConnectionStatus`
- `TopAppBarShellMenu`

## Runtime Composition

```mermaid
flowchart LR
  A[TopAppBar Composition Root] --> B[Session Store Selectors]
  A --> C[UI Layout Store Selectors]
  A --> D[resolveTopAppBarCopy locale]
  A --> E[TopAppBarWorkspaceSelectors]
  A --> F[TopAppBarGitRef]
  A --> G[TopAppBarConnectionStatus]
  A --> H[TopAppBarShellMenu]
```

## Multi-Language Strategy

- `topAppBar/copy.ts` is the single copy authority for app bar text.
- Current locales:
  - `en` default
  - `es` selected when browser locale starts with `es`.
- No hardcoded UI labels are allowed in app bar subcomponents.

## Styling Strategy

- `topAppBar/styles.ts` contains reusable class tokens for recurring visual
  patterns.
- Subcomponents consume these tokens instead of duplicating Tailwind strings.

## SRP Rules

- Each file in `topAppBar/` should keep one UI responsibility.
- `TopAppBar.tsx` should not contain menu internals, health rendering branches,
  or selector option rendering loops.

## Negative Test Targets

- Missing locale key fallback must resolve to `en`.
- `connectionStateOverride` must still override store state.
- Menu controls must continue toggling layout flags.

## Definition Of Done

- [ ] `TopAppBar.tsx` stays as composition root only.
- [ ] App bar labels come from `copy.ts`.
- [ ] Reused class tokens come from `styles.ts`.
- [ ] `pnpm --filter @dvt/web typecheck` passes.
- [ ] `pnpm --filter @dvt/web test` passes.
- [ ] `pnpm --filter @dvt/web build` passes.
