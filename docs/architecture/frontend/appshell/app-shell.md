---
title: App Shell
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-03
planning_type: architecture
---

# App Shell

## Purpose

The App Shell is the persistent runtime frame of the DVT frontend.

It owns app bootstrap, route framing, top-level navigation, health visibility,
and the shared layout around every routed view.

## Current Implementation

Primary code anchors:

- [App.tsx](../../../../apps/web/src/app/App.tsx)
- [Root.tsx](../../../../apps/web/src/app/Root.tsx)
- [routes.ts](../../../../apps/web/src/app/routes.ts)
- [TopAppBar.tsx](../../../../apps/web/src/app/components/TopAppBar.tsx)
- [LeftNavigation.tsx](../../../../apps/web/src/app/components/LeftNavigation.tsx)

Current shell regions:

```mermaid
flowchart TB
  Root["Root shell"] --> TopBar["TopAppBar"]
  Root --> Health["ShellHealthBanner"]
  Root --> Main["Main content"]
  Main --> Nav["LeftNavigation"]
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
- the console drawer exists as a shell primitive, but the product-level console
  story is not yet fully hardened.

## Related Pages

- [Main Workspace Views And UX](../main-workspace-views-and-ux.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Data Source Service Boundary](data-source-service-boundary.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
