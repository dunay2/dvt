---
title: Frontend Lineage
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-09-04
---

# Frontend Lineage

## Purpose

The Lineage route is the read-only dependency and impact-analysis view of the
DVT frontend.

It should help operators and authors answer:

- what this node depends on;
- what this node affects downstream;
- how wide the impact radius is.

Field/column lineage is not independently inferred by this route. The single
Canvas may project field lineage only from authoritative stable field references
and canonical semantic/provenance evidence.

## Current Implementation

Primary route anchors:

- [LineageView.tsx](../../../../../apps/web/src/app/views/LineageView.tsx)
- [useLineageViewData.ts](../../../../../apps/web/src/app/views/lineage/useLineageViewData.ts)
- [lineageModel.ts](../../../../../apps/web/src/app/views/lineage/lineageModel.ts)
- [graphStrategyRegistry.ts](../../../../../apps/web/src/app/plugins/graphStrategyRegistry.ts)

Current route: `/lineage`

Current behavior:

- loads the workspace graph snapshot;
- maps raw graph nodes and edges into canonical graph entities;
- derives upstream and downstream reachability from a focus node;
- uses an explicit route state model for `loading`, `error`, `empty`, and `ready`;
- renders graph-level lineage as layered cards;
- renders impact counts and breadcrumb context;
- does **not** synthesize field lineage from matching column names, compatible
  types, ordinals, or other presentation metadata.

The former route-local column-lineage mode and `{from,to}` matched-column read
model were retired by #2953 because they could manufacture false lineage.

## Field-Lineage Authority

The surviving field-lineage presentation belongs to the single Canvas projection:

- [canvasColumnLineageProjection.ts](../../../../../apps/web/src/app/views/canvas/canvasColumnLineageProjection.ts)

A field-lineage claim requires stable source/target field identity and, where
necessary, canonical semantic/provenance evidence. Names are display/validation
facts, not lineage join keys.

Conceptually:

```text
stable FieldId/reference
+ canonical Substrait/provenance
        ↓
field-lineage projection
        ↓
presentation names
```

If the required references are unavailable, the projection fails closed and
emits no field-lineage edge. It does not fall back to name/type matching.

## Relationship To The Canvas

- the Lineage route and the Canvas may consume graph context, but they do not own
  parallel field-lineage engines;
- the route remains the focused graph-level impact surface;
- the Canvas owns contextual field-lineage presentation from authoritative
  semantic/reference facts;
- dbt/external authority may provide evidence/profile facts but does not create a
  second Canvas or a second field-lineage authority;
- a future focus handoff may link the route and Canvas without duplicating state.

## UX Rules

- the route must start from a bounded focus, not the full graph universe;
- search should be the fastest way to recover context;
- route-level loading must preserve the lineage frame;
- route-level empty state must explain that no lineage focus is available;
- route-level graph-load failures must stay distinct from empty focus;
- the view should explain impact through counts and breadcrumbs before asking
  the user to read raw detail;
- unavailable field evidence must never be presented as inferred or empty field
  lineage.

## Mature Libraries And References

- bounded graph and dependency interactions:
  [React Flow](https://reactflow.dev/)
- analytical dependency and plugin patterns:
  [Backstage](https://github.com/backstage/backstage)

## Current Constraints

- the route remains graph-level and intentionally does not reverse-engineer field
  semantics from imported/provider metadata;
- some Canvas field-lineage shapes fail closed today where the current canonical
  inspection does not expose authoritative source FieldIds, for example the
  current UNION ALL projection;
- pin-to-canvas is signaled in the UI but not yet fully realized as a governed
  flow;
- richer transformation-aware field-lineage explanation remains follow-up work
  under #2945 after authoritative evidence exists.

## Related Pages

- [Lineage Panel Token Component](./lineage-panel-token-component.md)
- [Graph Frontend Architecture](../graph/graph-frontend-architecture.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
