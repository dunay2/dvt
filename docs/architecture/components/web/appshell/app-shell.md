---
title: App Shell
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-10
planning_type: architecture
---

# App Shell

## Purpose

The App Shell is the persistent runtime frame of the DVT frontend.

It owns app bootstrap, route framing, top-level navigation, health visibility,
and the shared layout around every routed view.

## Current Implementation

Primary code anchors:

- [App.tsx](../../../../../apps/web/src/app/App.tsx)
- [Root.tsx](../../../../../apps/web/src/app/Root.tsx)
- [routes.ts](../../../../../apps/web/src/app/routes.ts)
- [AppShellFrame.tsx](../../../../../apps/web/src/app/components/shell/AppShellFrame.tsx)
- [TopAppBar.tsx](../../../../../apps/web/src/app/components/TopAppBar.tsx)
- [LeftNavigation.tsx](../../../../../apps/web/src/app/components/LeftNavigation.tsx)
- [Console.tsx](../../../../../apps/web/src/app/components/Console.tsx)
- [bottomConsoleDrawerModel.ts](../../../../../apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts)

Current shell regions:

```mermaid
flowchart TB
  Root["Root shell"] --> Frame["AppShellFrame"]
  Frame --> TopBar["TopAppBar"]
  Frame --> Health["ShellHealthBanner"]
  Frame --> Body["Shell body"]
  Body --> Nav["LeftNavigation"]
  Body --> Main["Main content"]
  Main --> Outlet["Route outlet"]
  Main --> Console["Console drawer"]
```

## Shell Service Composition

The shell is also the composition boundary for frontend data source mode and
service wiring.

`Root` mounts `AppServicesProvider`, which resolves `VITE_DATA_SOURCE` once and
composes typed service instances for views and plugins through hooks.

This prevents route-level components from instantiating mode-aware services or
reading `resolveDataSource()` directly.

## Shell Navigation Ownership

The left rail now follows the same boundary rule as the rest of the shell:

- runtime capability data decides which plugin-contributed views are available;
- the shell normalizes those runtime views into a render-ready navigation model;
- the rail renders plain navigation items and does not know plugin manifest
  structure, label resolution, or shell footer ownership.

Current flow:

```mermaid
flowchart LR
  Query["useCapabilitiesQuery()"] --> Runtime["useShellRuntime()"]
  Runtime --> State["buildShellRuntimeState(capabilities)"]
  State --> Views["getNavigationViews(capabilities)"]
  Views --> Model["buildShellNavigationModel(navigationViews)"]
  Model --> Primary["primaryItems"]
  Model --> Footer["footerItems"]
  Primary --> Rail["LeftNavigationRail"]
  Footer --> Rail
```

Responsibility split:

```mermaid
flowchart TB
  subgraph Runtime["Runtime-owned truth"]
    Caps["Capabilities DTO"]
    Reg["Plugin registry navigation views"]
  end

  subgraph Shell["Shell-owned normalization"]
    State["buildShellRuntimeState"]
    Model["buildShellNavigationModel"]
    Footer["Shell footer items: Plugins, Admin"]
  end

  subgraph Render["Render-only rail"]
    Rail["LeftNavigationRail"]
    Link["NavLink + Tooltip"]
  end

  Caps --> State
  Reg --> State
  State --> Model
  Footer --> Model
  Model --> Rail
  Rail --> Link
```

## Bottom Console Drawer Ownership

The bottom drawer now follows the same separation rule as the rest of the shell:

- shell copy and shell chrome stay in shell-owned modules;
- the drawer resolves a small, explicit state model before rendering;
- the render surface stays focused on header, badges, close action, and body slot ownership.
- the drawer is a shell companion surface, not the durable run workspace authority.

Current state model:

```mermaid
flowchart LR
  Inputs["dataSourceMode + runId + isLoading + lines"] --> Model["buildBottomConsoleDrawerModel(...)"]
  Model --> Idle["idle: empty-state guidance"]
  Model --> Loading["loading: run badge + loading copy"]
  Model --> Streaming["streaming: run badge + xterm surface"]
```

Authority split with the Runs route:

```mermaid
flowchart LR
  Events["GET /runs/:runId/events"] --> DrawerHook["useConsoleLogStream()"]
  Events --> RunsFacade["RunWorkspaceFacade"]
  Snapshot["GET /runs/:runId"] --> RunsFacade
  DrawerHook --> Drawer["BottomConsoleDrawer"]
  RunsFacade --> Runs["Runs workspace"]
```

Boundary rules for these two surfaces:

- `BottomConsoleDrawer` mirrors the currently active run as a shell-level live companion;
- `BottomConsoleDrawer` does not claim snapshot authority, failure-diagnostics authority, or full run-detail ownership;
- `Runs` owns durable run monitoring through snapshot plus timeline composition;
- `Runs` is the place where degraded timeline state, runtime snapshot truth, result evidence, and failure diagnostics are explained.

Rules for this seam:

- `LeftNavigation.tsx` must not import `resolveString`, plugin manifests, or
  fixed shell footer item definitions;
- plugin-contributed views become `primaryItems` inside the shell model;
- shell-owned routes such as `Plugins` and `Admin` stay in `footerItems`;
- the rail consumes render-ready `{ to, label, icon }` items and stays focused
  on navigation chrome and routing behavior.

## UX Rules

- the top bar stays visible across all routed views;
- platform-health state must be visible without entering a diagnostic route;
- focus mode hides secondary chrome but keeps the active view intact;
- route switches should not remount the entire shell frame.

## Mature Libraries And References

- base shell primitives:
  [Radix Primitives](https://www.radix-ui.com/primitives),
  [shadcn/ui](https://ui.shadcn.com/)
- workbench precedent:
  [VS Code](https://github.com/microsoft/vscode)

## Current Constraints

- the shell store still carries too much non-shell state through `appStore.ts`;
- some shell quick actions are placeholders and not yet connected to governed
  behavior;
- the console drawer now has an explicit shell-owned content model, but richer
  live-stream semantics and typed log states remain future work;
- the drawer and the Runs route still need a later convergence slice for shared
  event/log presentation semantics beyond the current authority split.

## Current-To-Target Mapping

The shell already exists in working form. The current step is to keep making
the extracted primitives honest and small.

- `AppShellFrame`
  Current anchor: [AppShellFrame.tsx](../../../../../apps/web/src/app/components/shell/AppShellFrame.tsx) plus [Root.tsx](../../../../../apps/web/src/app/Root.tsx)
  Decision: keep the extracted shell frame small and behavior-preserving.
- `ShellTopBar`
  Current anchor: [TopAppBar.tsx](../../../../../apps/web/src/app/components/TopAppBar.tsx)
  Decision: keep the global context behavior, narrow the contract, and token-clean it.
- `LeftNavigationRail`
  Current anchor: [LeftNavigation.tsx](../../../../../apps/web/src/app/components/LeftNavigation.tsx) plus [shellNavigationModel.ts](../../../../../apps/web/src/app/shell/shellNavigationModel.ts)
  Decision: keep a render-only rail plus a shell-owned navigation model.
- `ShellHealthBanner`
  Current anchor: [ShellHealthBanner.tsx](../../../../../apps/web/src/app/components/ShellHealthBanner.tsx)
  Decision: keep and restyle through semantic tokens.
- `BottomConsoleDrawer`
  Current anchor: [Console.tsx](../../../../../apps/web/src/app/components/Console.tsx) plus [bottomConsoleDrawerModel.ts](../../../../../apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts)
  Decision: keep the drawer pattern, with a shell-owned state model and future log hardening.

## Shell Organization Rules

The shell layer should become explicit in code structure:

- `components/ui`: low-level library primitives only;
- `components/shell`: top bar, navigation rail, health banner, console drawer,
  and shell-only helpers;
- `components/workbench`: route-level shared layout primitives used by multiple
  views;
- `views/<route>`: route composition and route-only components.

This matters because the current shell pieces are real, but they still live as
standalone feature files instead of as an intentional shell package boundary.

## Store Boundary Rule

The current [`appStore.ts`](../../../../../apps/web/src/app/stores/appStore.ts)
mixes shell state, route state, execution state, and graph state.

Target direction:

- shell store: focus mode, shell drawer visibility, nav state, health display
  preferences;
- canvas/workbench store: route-local selection, viewport, and panel state;
- server state: queries stay in TanStack Query, not in Zustand;
- execution state: current run and run detail should not stay coupled to shell
  layout concerns.

Legacy warning:

- [`stores/index.ts`](../../../../../apps/web/src/app/stores/index.ts) is a
  duplicate store surface from an older architecture path and should not be the
  basis for new shell work.

## Related Pages

- [Main Workspace Views And UX](../main-workspace-views-and-ux.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Workbench UI Contract And Component Inventory](../workbench-ui-contract-and-component-inventory.md)
- [Data Source Service Boundary](./data-source-service-boundary.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
