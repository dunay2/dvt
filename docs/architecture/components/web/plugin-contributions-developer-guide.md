---
title: Plugin Contributions Developer Guide
status: Active
owner: Frontend / Docs
last_reviewed: 2026-04-17
---

# Plugin Contributions Developer Guide

## Purpose

Explain the active frontend plugin authoring model for `apps/web`.

This guide is the canonical entry point for plugin authors who need to add a
new frontend contribution without treating `apps/web/*.md` as the source of
truth.

## Governing Sources

- [web component](./index.md)
- [Plugin UX Integration Contract](../../../planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/05-plugin-ux-integration-contract.md)
- [registry.ts](../../../../apps/web/src/app/plugins/registry.ts)
- [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)

## Current Contract Boundary

The active public authoring surface is `PluginContributions` in
[registry.ts](../../../../apps/web/src/app/plugins/registry.ts).

`PluginManifest` in
[PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)
still exists, but it is scaffolding and forward-compatibility infrastructure.
It is not the minimum contract plugin authors must implement for the current
static frontend composition model.

## Authoring Flow

1. Create a new plugin folder under `apps/web/src/app/plugins/`.
2. Export one `PluginContributions` object from your plugin entry file.
3. Register that contribution in `PLUGIN_REGISTRY`.
4. Add only the contribution surfaces your plugin actually owns.
5. Cover pure contribution logic with tests before wiring route-level UI.

Minimal shape:

```ts
import type { PluginContributions } from '../registry';

export const myPluginContributions: PluginContributions = {
  id: 'my-plugin',
  displayName: 'My Plugin',
  version: '1.0.0',
  capabilities: ['canvas.overlay'],
};
```

## Available Contribution Surfaces

<!-- markdownlint-disable MD060 -->

| Surface                 | Contract owner                                                                                                        | Use for                                                 | Main guardrail                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `views`                 | `ViewContribution` in [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)           | route-level workbenches and navigation entries          | do not invent shell chrome outside governed route/header surfaces      |
| `overlays`              | `CanvasOverlayContribution` in `contracts/NodeRendering.ts`                                                           | pure canvas decorations and mode-specific overlay logic | keep `nodeDecorator` pure; no fetch, stores, or runtime side effects   |
| `inspectorPanels`       | `InspectorPanelContribution` in [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts) | node-context detail panels                              | answer a concrete question; do not duplicate navigation                |
| `nodeBadges`            | `NodeBadgeContribution` in `contracts/NodeRendering.ts`                                                               | compact status or type signals on nodes                 | badges must stay secondary to node readability                         |
| `nodeRenderers`         | `NodeRendererRegistration` in `contracts/NodeRendering.ts`                                                            | a renderer for a plugin-owned node kind                 | renderer owns node visuals, not graph layout or shell orchestration    |
| `nodeKinds`             | `NodeKindRegistration` in `nodeTypeContracts.ts`                                                                      | plugin-owned node type metadata                         | keep kind metadata aligned with renderer and planner-preview semantics |
| `connectionRules`       | `PluginConnectionRule` in [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)       | intra-plugin edge constraints                           | shell graph invariants still run first                                 |
| `produces` / `consumes` | `PluginDataPort` in [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)             | cross-plugin bridge declarations                        | use these only for cross-plugin data compatibility                     |
| `runAdapter`            | inline shape in [registry.ts](../../../../apps/web/src/app/plugins/registry.ts)                                       | mapping plugin-native run data into `CanonicalRun`      | keep the shell-facing run shape canonical                              |

<!-- markdownlint-enable MD060 -->

## Registration Rule

The shell reads contributions from the static `PLUGIN_REGISTRY` array in
[registry.ts](../../../../apps/web/src/app/plugins/registry.ts).

That means:

- no lifecycle registration ceremony is required for the current v1 model
- composition order is explicit in the registry file
- equal-priority tie-breaking follows registry order

## Practical Guardrails

- Keep overlays, badges, and mappers pure.
- Do not fetch inside renderers or `nodeDecorator`.
- Do not turn plugins into alternate shell ownership.
- Prefer `node.metadata` and canonical view models over ad-hoc local state.
- Use route views for real workbenches; use inspector panels for contextual detail.
- Treat `PluginManifest` lifecycle fields as non-authoritative for current v1 authoring.

## Minimum Test Expectations

- test overlay decorators as pure functions
- test `shouldShow` predicates for inspector panels
- test renderer or panel rendering where the contribution owns visible behavior
- keep plugin-specific run mapping covered if `runAdapter` is implemented

## Related Pages

- [web component](./index.md)
- [Canvas Component Map And Modernization Review](./graph/canvas-component-map-and-modernization-review.md)
- [Frontend Runtime Contract Technical Manual](./runs/frontend-runtime-contract-technical-manual.md)
