---
title: Plugin Contributions Developer Guide
status: Active
owner: Frontend / Docs
last_reviewed: 2026-04-20
---

# Plugin Contributions Developer Guide

## Purpose

Explain the active frontend plugin authoring model for `apps/web` and provide the canonical extension path for new or modified plugins.

## Governing Sources

- [web component](./index.md)
- [Plugin UX Integration Contract](../../../planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/05-plugin-ux-integration-contract.md)
- [registry.ts](../../../../apps/web/src/app/plugins/registry.ts)
- [PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)

## Authoring Model

The active public authoring surface is `PluginContributions` in
[registry.ts](../../../../apps/web/src/app/plugins/registry.ts).

`PluginManifest` in
[PluginManifest.ts](../../../../apps/web/src/app/plugins/contracts/PluginManifest.ts)
remains the typed source for shared contribution shapes such as
`ViewContribution`, `InspectorPanelContribution`, and
`PluginConnectionRule`. For the current static frontend composition model:

- plugin authors implement `PluginContributions`
- plugin authors reuse shared types from the `contracts/` files
- plugin authors do not instantiate `PluginManifest` directly
- plugin authors do not create alternate registries or parallel retired manifests

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

## Reference Implementation Map

Use the built-in `dbt` plugin as the reference slice for the current v1 model.

<!-- markdownlint-disable MD060 -->

| Concern                        | Reference file                                                                                                                | Responsibility                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| contribution entry             | [dbtContributions.ts](../../../../apps/web/src/app/plugins/dbt/dbtContributions.ts)                                           | single declarative plugin object consumed by `PLUGIN_REGISTRY` |
| registry wiring                | [registry.ts](../../../../apps/web/src/app/plugins/registry.ts)                                                               | static composition and shell-facing selectors                  |
| node kinds                     | [nodeTypeCatalog.dbt.ts](../../../../apps/web/src/app/plugins/nodeTypeCatalog.dbt.ts)                                         | canonical plugin-owned kind metadata                           |
| renderer and inspector panels  | [DbtNodeRenderer.tsx](../../../../apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx)                                           | node visuals and plugin-owned contextual panels                |
| graph mapping and drag payload | [dbtNodeAdapter.ts](../../../../apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts)                                               | plugin-native node and edge mapping into canonical shell types |
| connection policy tests        | [dbtContributions.connectionRules.test.ts](../../../../apps/web/src/app/plugins/dbt/dbtContributions.connectionRules.test.ts) | pure coverage for dbt-local connection policy                  |

<!-- markdownlint-enable MD060 -->

Read this map as a decomposition rule: keep the contribution file declarative,
put behavior in the owning module, test pure policy close to the policy, and
route shell-facing composition only through `registry.ts`.

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

- no lifecycle registration ceremony is required for the current v1 model
- composition order is explicit in the registry file
- equal-priority tie-breaking follows registry order

Only touch the shared contract files when a new contribution surface is needed
for every plugin. Do not hide new shell behavior behind plugin-local extra
fields that the shell does not govern.

## Extending An Existing Plugin

Use this path when the plugin identity stays the same and you are changing one
of its owned contribution surfaces.

1. Change the behavior module first.
2. Update the plugin `PluginContributions` object to expose that behavior.
3. Add or update the narrowest tests for the changed surface.
4. Validate shell integration only where the contribution crosses a route,
   renderer, or registry boundary.

Decision rule by surface:

- new workbench route: update the plugin contribution, the route component,
  and the plugin-owned route bootstrap handle together; the registry must not
  import route bootstrap handles from `views/`
- new node kind: update the node-kind catalog, canonical mapping, and renderer
  registration together
- new inspector panel: keep `shouldShow` and panel rendering local to the
  plugin, not in shell routing code
- new connection rule: change `connectionRules` and add pure policy tests
- new run normalization: change `runAdapter` and test canonical projection
- new cross-plugin data bridge: change `produces` or `consumes` and verify the
  connection or authoring rules that depend on that declaration

## Adding A New Plugin

Use this path only when the behavior belongs to a distinct plugin identity.

1. Create a folder under `apps/web/src/app/plugins/<plugin-id>/`.
2. Add one exported `PluginContributions` object as the plugin entrypoint.
3. Implement only the capability surfaces the plugin actually owns.
4. Register the entry in `PLUGIN_REGISTRY`.
5. Add focused tests for every pure rule or plugin-owned visual behavior.
6. If the plugin adds a route, wire the route bootstrap handle and route tests
   in the same slice.

Do not add alternate registration flows, lazy discovery outside `PLUGIN_REGISTRY`, parallel retired contribution objects, or duplicate routes for the same workbench intent.

## Common Change Matrix

<!-- markdownlint-disable MD060 -->

| Change goal              | Files to touch first                                                                                          | Minimum tests to add or update                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| add a workbench route    | plugin `*Contributions.ts`, route view, route bootstrap handle                                                | route bootstrap test and route rendering coverage     |
| add a node kind          | node-kind catalog, adapter mapper, renderer registration                                                      | canonical mapping test and renderer coverage          |
| change connection policy | plugin `connectionRules`                                                                                      | pure connection-rule tests                            |
| add an inspector panel   | plugin panel module and `inspectorPanels` registration                                                        | `shouldShow` coverage and panel rendering test        |
| add data bridges         | `produces` or `consumes`, plus any graph-authoring rule that enforces compatibility                           | connection or authoring policy tests                  |
| add run normalization    | `runAdapter` and the module that maps plugin-native payloads into `CanonicalRun`                              | canonical run mapping tests                           |
| add a new global surface | `registry.ts`, relevant contract file under `contracts/`, this guide, and every plugin that must implement it | registry selector tests plus targeted plugin coverage |

<!-- markdownlint-enable MD060 -->

## Practical Guardrails

- Keep overlays, badges, and mappers pure.
- Keep the contribution file declarative; move behavior to dedicated modules.
- Do not fetch inside renderers or `nodeDecorator`.
- Do not turn plugins into alternate shell ownership.
- Prefer `node.metadata` and canonical view models over ad-hoc local state.
- Use route views for real workbenches; use inspector panels for contextual detail.
- Treat `PluginManifest` lifecycle fields as non-authoritative for current v1 authoring.
- Remove replaced paths instead of keeping parallel retired routes or fallback
  contribution wiring.
- If two plugins start copying the same renderer, mapper, or panel logic,
  extract a shared module deliberately instead of duplicating the pattern.

## Minimum Test Expectations

- test overlay decorators as pure functions
- test `shouldShow` predicates for inspector panels
- test renderer or panel rendering where the contribution owns visible behavior
- keep plugin-specific run mapping covered if `runAdapter` is implemented

## Validation Checklist

For plugin work in `apps/web`, the baseline closeout is:

1. `pnpm --filter @dvt/web typecheck`
2. `pnpm --filter @dvt/web test`
3. `pnpm lint`
4. `pnpm verify:prepush`

## Related Pages

- [web component](./index.md)
- [Canvas Component Map And Modernization Review](./graph/canvas-component-map-and-modernization-review.md)
- [Frontend Runtime Contract Technical Manual](./runs/frontend-runtime-contract-technical-manual.md)
