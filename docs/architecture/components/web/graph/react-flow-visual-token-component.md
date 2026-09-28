---
title: React Flow Visual Token Component
status: Active
owner: Web / Canvas
last_reviewed: 2026-09-27
planning_type: architecture
---

# React Flow Visual Token Component

This component owns the React Flow graph visual tokens used by Canvas graph
projection, generic plugin graph node rendering, and graph-node card chrome.

## Public API

Token ownership is split by concern: `graphCardVisualTokens.ts` owns card layout,
tags, identity tooltips and health borders; `graphMetricVisualTokens.ts` owns
metric rows, operational rails and popovers; `graphColumnVisualTokens.ts` owns
column controls. `graphVisualTokens.ts` retains edge, node-kind and fallback
tokens. Consumers import the owning module directly, without a compatibility
barrel. The model header is content-sized and no longer reserves a last-run slot.

- `graphNodeCardSurfaceClasses`: outer card surface and state classes.
- `graphNodeCardLayoutClasses`: graph-node card internal layout classes.
- `graphNodeMetricRowClasses`: compact card metric row classes.
- `graphNodeTagListClasses`: graph-node tag list classes.
- `graphNodeOperationalRailClasses`: operational metric rail classes.
- `graphNodeHealthPopoverClasses`: operational health popover classes.
- `graphNodeHealthBorderClasses`: healthy, failed, and neutral card-border
  classes projected from `ProjectGraphNodeCardReadModel`.
- `fallbackGraphNodeClasses`: fallback node renderer classes.
- `graphNodeColumnClasses`: optional graph-node column list classes.
- `graphStatusBadgeClasses`: inspector badge tone classes for plugin node
  runtime state.
- `graphNodeKindToneClasses`: semantic border and minimap tones for known node
  kinds.
- `graphFlowPalette`: React Flow edge and fallback minimap palette values.
- `resolveGraphNodeKindTone(kind)`: returns a known node-kind tone or the
  fallback tone.
- `projectCanvasNodeAccessibleHealth(...)`: applies strategy-owned health to a
  focusable React Flow node label without duplicating health rules.

## Invariants

- Canvas edge projection reads edge colors from `graphFlowPalette`.
- Node-kind catalogs do not own hex minimap literals.
- Generic graph renderers and plugin-owned dbt node renderer chrome do not own
  `slate-*`, `gray-*`, `neutral-*`, or hex visual decisions.
- Graph-node card presentation components consume responsibility-specific token
  groups instead of a shared catch-all class bag.
- Metric rows and operational rails share one status-tone map. Popovers reuse
  that map with an explicit neutral-surface override; they do not redefine the
  same success, warning, failure or running colors.
- A card's base border comes only from its projected health: solid green for
  healthy, dashed red for failed, and solid neutral when evidence is absent or
  non-terminal. The line style keeps failure distinguishable without color.
- Selection and keyboard focus remain separate rings; they do not replace or
  reinterpret health.
- Cost, runtime, and other overlay borders render on an inner decoration layer;
  they never overwrite the outer health border.
- The focusable React Flow node label includes health from the same card read
  model that selects the border; health is not repeated as a visible status
  chip.
- If a plugin card strategy throws while projecting accessible health, the
  focusable label falls back to canonical default health for that node; plugin
  failure cannot replace the Canvas route.
- Draft-backed and dbt project-file Canvas controllers use the same accessible
  health projector.
- Shell-owned runtime enrichment re-runs that projector from the final node data
  so the focusable label and rendered border cannot diverge.
- Plugin-specific behavior remains in plugin contracts; this component owns only
  presentation tokens.

## Explicit data action

`CanvasNodeDataAction` owns the shared Execute chrome in outer graph cards and
relational operation cards. Reuse `PreviewWarehouseSourceObjectRows` and
`PreviewCanvasTransformRows`; visibility never invokes either query or changes
their existing scope/authorization checks.

The action is hidden at rest and revealed only while its card/action area is
hovered or contains keyboard-visible focus. A mouse-selected card does not pin
the action open. Keep the button mounted and its space reserved: showing it
must not resize the card, move ports or connections, or reset focus. The pointer
must be able to cross the gap between the card and the button without hiding it.
Disabled actions follow the same reveal rule and retain disabled styling.

Use one CSS rule in the shared action owner, not per-card React hover state.
Browser proof must cover outer Source/Model and inner operation cards, leaving
the card, keyboard access, unchanged geometry and no query/save on reveal.

## Transitions

```mermaid
flowchart LR
    Catalog["Plugin node-kind catalog"] --> Tone["resolveGraphNodeKindTone"]
    Tone --> Minimap["React Flow minimap color"]
    Tone --> NodeKindAccent["Node-kind accent"]
    CanvasMapper["Canvas node mapper"] --> EdgePalette["graphFlowPalette.edge"]
    Card["GraphNodeCardView"] --> CardSurface["graphNodeCardSurfaceClasses"]
    Card --> CardLayout["graphNodeCardLayoutClasses"]
    Card --> Columns["graphNodeColumnClasses"]
    CardHealth["ProjectGraphNodeCardReadModel.health"] --> HealthBorder["graphNodeHealthBorderClasses"]
    HealthBorder --> Card
    Metrics["GraphNodeMetricRow"] --> MetricTokens["graphNodeMetricRowClasses"]
    Tags["GraphNodeTagList"] --> TagTokens["graphNodeTagListClasses"]
    Rail["GraphNodeOperationalRail"] --> RailTokens["graphNodeOperationalRailClasses"]
    Health["GraphNodeHealthPopoverView"] --> HealthTokens["graphNodeHealthPopoverClasses"]
    Fallback["FallbackNodeRenderer"] --> FallbackTokens["fallbackGraphNodeClasses"]
    DbtRenderer --> StatusBadge["graphStatusBadgeClasses"]
```

## Consumers

- `nodeTypeCatalog.dbt.ts`
- `dvtNodeTypeCatalog.ts`
- `canvasNodeMapper.ts`
- `GraphNodeRenderer.tsx`
- `GraphNodeCardView.tsx`
- `GraphNodeMetricRow.tsx`
- `GraphNodeTagList.tsx`
- `GraphNodeOperationalRail.tsx`
- `GraphNodeHealthPopoverView.tsx`
- `FallbackNodeRenderer.tsx`
- `DbtNodeRenderer.tsx`

## Drift Guard

`graphVisualTokenConvergence.architecture.test.ts` rejects reintroduced local
color-family or hex ownership in the graph renderer, fallback renderer, dbt
node renderer, graph-node card presentation components, node-kind catalogs, and
Canvas edge mapper.
