---
title: DVT Canvas Node Identity And Naming Policy
status: Draft
owner: ChatGPT / Architecture / Web
last_reviewed: 2026-05-31
planning_type: architecture-note
---

# DVT Canvas Node Identity And Naming Policy

## 1. Problem observed

The current canvas can display several nodes with the same visible name, for example multiple cards called `Source 2`. Even if each node has a unique internal identifier, the canvas becomes ambiguous for the user because the primary visual label no longer distinguishes the nodes.

- The user cannot easily know which `Source 2` feeds which transformation.
- The left catalog groups nodes by type, but the displayed node names do not communicate business meaning.
- Duplicate titles make debugging, documentation, lineage and code review harder.
- The problem is also an opportunity: keeping immutable identifiers allows safe references, while richer labels improve UX.

## 2. Recommended decision

DVT should separate three different concepts and render them differently in the UI:

```ts
nodeId        // immutable technical identity: e.g. src_01J...
displayName   // editable human label: e.g. Orders source
semanticRef   // real object/reference: e.g. raw.orders, stg_orders, model.sales.orders
shortId       // compact visual suffix derived from nodeId: e.g. A7F3
```

The technical identifier must always exist, but it should not be the primary title shown to the user. The visible card should prioritize business meaning and only expose the identifier as a secondary disambiguator.

## 3. Visual rule for node cards

Every node card should render two levels of identity:

```text
Primary title:     displayName or semanticRef
Secondary line:    kind label · semanticRef or #shortId
```

| Current           | Minimum acceptable     | Preferred                              |
| ----------------- | ---------------------- | -------------------------------------- |
| `Source 2`        | `Source 2 · #S2A1`     | `raw.orders` / `Source · #S2A1`        |
| `SQL transform 1` | `SQL transform 1 · #T91B` | `Normalize orders` / `SQL transform · stg_orders` |
| `Sink 1`          | `Sink 1 · #K3D2`       | `mart.orders_daily` / `Sink · #K3D2`   |

## 4. Naming policy

1. `nodeId` is always unique, immutable and never reused.
2. `displayName` is visible, editable and may be user-defined.
3. `semanticRef` is shown when available and should represent the real object or logical target.
4. Automatic names must never duplicate within the same canvas.
5. Manual duplicates may be allowed, but the UI must show a `shortId` disambiguator.
6. The inspector must always expose the full technical identity and allow copying it.

## 5. Auto-naming rules

When the system creates nodes automatically, it should generate unique names by type:

```text
Source 1
Source 2
Source 3
SQL transform 1
SQL transform 2
Sink 1
```

When duplicating a node, prefer assigning the next available name rather than copying the exact title. This avoids accidental duplicates:

```text
Duplicating “Source 2” -> “Source 7”
Duplicating “Normalize orders” -> “Normalize orders copy” only if semantic duplication is intentional
```

## 6. Manual duplicate handling

DVT should not necessarily block duplicate names. Duplicate names can be legitimate when several nodes represent instances of the same template, source family or logical role. However, every duplicate must be visually disambiguated.

```text
orders · #A7F3
orders · #B82C
```

The suffix should be subtle, not part of the primary name, and derived from `nodeId`. This preserves clarity without forcing artificial business names.

## 7. Inspector fields

| Field | Description |
| ----- | ----------- |
| Display name | Editable user-facing label. |
| Node ID | Immutable technical identifier, copyable. |
| Short ID | Compact visual suffix derived from `nodeId`. |
| Semantic ref | Real object reference: table, model, view, artifact or target. |
| Kind | `source`, `sql_transform`, `sink`, etc. |
| Created from | `manual`, `dbt_manifest`, `artifact_import`, `template`, `generated`. |
| Status | `authoring`, `valid`, `invalid`, `running`, `completed`, `failed`. |

## 8. Left catalog / Project Nodes

The left panel should keep grouped counters, but list meaningful labels underneath each group. The count is useful, but it should not replace node identity.

```text
Source (6)
  raw.customers
  raw.orders
  raw.payments
  Source 4 · #A7F3

SQL transform (3)
  stg_orders
  normalize_payments
  SQL transform 3 · #T91B

Sink (1)
  mart.orders_daily
```

## 9. Proposed TypeScript model

```ts
export type CanvasNodeOrigin =
  | 'manual'
  | 'dbt_manifest'
  | 'artifact_import'
  | 'template'
  | 'generated';

export type CanvasNodeKind =
  | 'source'
  | 'sql_transform'
  | 'sink';

export interface CanvasNodeIdentity {
  readonly nodeId: string;          // immutable, globally unique in workspace/canvas
  readonly kind: CanvasNodeKind;
  readonly displayName: string;     // visible, editable
  readonly semanticRef?: string;    // raw.orders, stg_orders, model.sales.orders
  readonly shortId: string;         // derived from nodeId, e.g. A7F3
  readonly createdFrom?: CanvasNodeOrigin;
}
```

## 10. Acceptance criteria

- Creating nodes repeatedly never produces duplicate automatic names inside the same canvas.
- If duplicate display names exist, all duplicate cards show a `shortId` suffix.
- Node cards show a meaningful primary title and a secondary identity line.
- The inspector exposes `nodeId`, `shortId`, `displayName`, `kind` and `semanticRef`.
- The left Project Nodes panel lists meaningful node names, not only type counters.
- Persisted edges and references use `nodeId`, never `displayName`.
- Renaming a node does not break edges, lineage, run history or plan references.

## 11. UX rationale

The user should reason visually in business language, while the system reasons technically through immutable IDs. This is the same separation used by mature graph tools: the visible title is optimized for cognition; the ID is optimized for persistence and references.

| Option | Clarity | Recommendation |
| ------ | ------- | -------------- |
| Only repeated `Source 2` | Low | Reject |
| `Source 2 · #A7F3` | Medium | Acceptable fallback |
| `raw.orders` plus secondary type/id | High | Preferred |
| Technical ID as title | Low for business users | Reject |
| Editable name plus ID in inspector | High | Recommended |

## 12. Implementation notes

- `shortId` should be deterministic and derived from `nodeId`, not stored as independent authority unless needed for performance.
- Duplicate detection should be scoped by canvas/workspace, not globally across all tenants.
- `semanticRef` should be optional because authoring nodes may exist before binding to a real object.
- Node rename should be treated as metadata mutation, not structural graph mutation.
- Plan compilation must always use `nodeId`/`semanticRef`, never `displayName` as identity.

## 13. Final decision

DVT should keep immutable node identifiers as the persistence authority, but the UI must not rely on repeated display titles. The least confusing model is: business-readable title first, type/reference/shortId second, full technical identity in the inspector.

Final rule:

1. `nodeId` is immutable identity.
2. `displayName` is human-facing label.
3. `semanticRef` is the real data object or logical reference.
4. Duplicates are allowed only when visually disambiguated.
5. Edges, plans, lineage and run history never depend on `displayName`.
