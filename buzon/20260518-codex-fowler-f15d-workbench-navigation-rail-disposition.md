---
title: F-15-D Fowler Analysis - Workbench Navigation Rail Disposition
status: Review
date: 2026-05-18
owner: Frontend / Shell
task: E/F-15-D
---

# F-15-D Fowler Analysis - Workbench Navigation Rail Disposition

## Context

The loaded Canvas workbench showed a permanent left rail even though the newer
shell specification says the workbench should not carry a permanent left rail.
The rail also duplicated route-level navigation while Canvas already has its
own workbench tab model.

## Fowler View

### Improved Patterns

- Introduced an explicit shell query model:
  `resolveShellNavigationDisposition(pathname)`.
- Moved route-family chrome posture out of `AppShellFrame`.
- Kept global navigation reachable through `ShellMenu` when the rail is hidden.
- Preserved the separation between shell navigation and Canvas workbench tabs.

### Antipatterns Found

- Control coupling: `AppShellFrame` previously inferred chrome posture from
  `focusMode` only.
- Global default leak: the permanent rail became universal shell behavior even
  on dense workbench routes.
- Navigation duplication: Canvas workbench tabs and shell rail competed in the
  same first viewport.
- Documentation drift: the accepted no-permanent-left-rail workbench posture was
  not represented in code.

### Groupable Components

| Component                       | Concern                                        |
| ------------------------------- | ---------------------------------------------- |
| `shellNavigationDisposition.ts` | Route-family shell chrome policy.              |
| `AppShellFrame.tsx`             | Slot layout and posture application.           |
| `ShellMenu.tsx`                 | Menu-mode global navigation and view controls. |
| `LeftNavigation.tsx`            | Pinned rail rendering only.                    |

### Repetitions Removed

- Removed the need for focus mode to be the only path to hiding rail chrome.
- Avoided duplicating Canvas workbench navigation in the shell rail on Canvas
  routes.

### Opportunities

- F-15 can later decide whether additional dense workbench routes should use the
  same menu posture.
- The `View` menu can be split into `Navigation` and `View controls` if top-bar
  density remains high.
- Visual QA should verify that the empty Canvas state no longer pays the
  permanent rail width.

### Drift Fixed

| Drift                                                     | Fix                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Spec says no permanent workbench rail, UI rendered one.   | `/canvas` now resolves `railMode: hidden`.                          |
| Global links risked disappearing if the rail was removed. | `ShellMenu` renders global navigation links from `navigationModel`. |
| Shell frame owned route behavior implicitly.              | Route behavior moved to `shellNavigationDisposition.ts`.            |

## User Stories

1. As a Canvas author, I can enter `/canvas` without a permanent left rail
   consuming workbench space.
2. As a shell user, I can still navigate to Canvas, Runs, Plugins, and Admin
   from the top-bar menu when the rail is hidden.
3. As an operator, I can open `/runs` and still see the pinned global rail with
   active route state.
4. As a maintainer, I can add future workbench route posture by extending the
   shell disposition model instead of editing generic frame layout.

## TDD Evidence

Red:

- `Root.shellChrome.test.tsx` failed because `/canvas` still mounted
  `[data-slot="left-navigation-rail"]`.
- `routes.test.tsx` failed because Canvas route still exposed rail captions.

Green:

- `shellNavigationDisposition.test.ts` proves workbench/global route partition.
- `Root.shellChrome.test.tsx` proves no permanent rail on `/canvas`, menu-mode
  global links, and pinned rail on `/runs`.
- `shellNavigationDisposition.architecture.test.ts` proves semantic ownership
  and documentation alignment.

## ADR Decision

No ADR required for this slice. The work implements the existing shell
specification and Planning DB task F-15-D without changing public backend
contracts or cross-package architecture.
