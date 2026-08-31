---
title: VTX2 Substrait UNION ALL authoring evidence
status: Accepted
date: 2026-08-31
owners:
  - web
  - contracts
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.ts
  - apps/web/src/app/views/canvas/DvtSubstraitUnionAllAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/views/canvas/canvasPreviewProvenance.ts
  - apps/web/cypress/e2e/canvas/canvas-substrait-union-all.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web exec node ../../tools/ci/run-web-cypress-native.mjs run --browser chrome --headed --spec cypress/e2e/canvas/canvas-substrait-union-all.cy.ts
    - pnpm verify:prepush
---

# VTX2 Substrait UNION ALL authoring evidence

## Scope

Issue #2634 admits and exposes the first bounded Set composition vertical:

```text
two connected PostgreSQL datasets with the same ordered string schema
  -> one typed SetRel(SET_OP_UNION_ALL)
  -> one Transform card and stable DVT identity/provenance sidecar
  -> one deterministic PostgreSQL UNION ALL Preview
```

The Canvas action is available only for exactly two distinct sources on the
same `ConnectionRef` with identical non-empty ordered field names and types.
Source identity is ordered deterministically by stable node identity, never by
card coordinates or incidental edge order.

## Architecture boundary

The slice follows
`docs/architecture/fowler-opportunity-planning-governance.md`: it closes one
admitted product capability through the existing Canvas authoring and Preview
rails, without introducing a parallel relational model or speculative
abstraction.

The implementation reuses `ConfigureCanvasDvtNode`, `GetWorkspaceGraphDraft`,
and `PreviewExecutionPlan`. Pinned Substrait v0.101.0 `SetRel` with
`SET_OP_UNION_ALL` owns the semantic meaning. The sidecar owns stable
`RelationId`, `FieldId`, and source provenance only. PostgreSQL SQL is derived
from that revision:

```sql
select customer_id, name, country from public.customers_north
union all
select customer_id, name, country from public.customers_south
```

Mismatched schemas, providers, connections, duplicate sources, fewer or more
inputs, unsupported set operations, advanced extensions, malformed bindings,
or stale semantic hashes fail closed. No `UnionNode`, `UnionStep`, private
relational IR, store, service, runtime activity, materialization, dbt importer,
or alternate Preview path is introduced.

## Product evidence

The headed Chrome E2E opens an empty Transform connected to two compatible
dataset cards, focuses `Union all`, activates it with Enter, applies through
the existing inspector command, verifies the saved typed Plan, reloads the
Canvas, and confirms the same two inputs and three card fields. Focused tests
also prove canonical encode/decode, stable identities, two-source lineage,
catalog admission, deterministic PostgreSQL rendering, graph validation,
Preview artifact routing, card projection, and negative conformance.

`UNION DISTINCT`, intersection/minus, more than two inputs, type coercion, and
aggregate/window composition remain outside this cut and require separate
admission evidence.
