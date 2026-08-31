---
title: VTX2 Substrait row-number window authoring evidence
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
  - apps/web/src/app/views/canvas/canvasDvtSubstraitWindow.ts
  - apps/web/src/app/views/canvas/DvtSubstraitPilotAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/views/canvas/canvasPreviewProvenance.ts
  - apps/web/cypress/e2e/canvas/canvas-substrait-window.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web exec node ../../tools/ci/run-web-cypress-native.mjs run --browser chrome --headed --spec cypress/e2e/canvas/canvas-substrait-window.cy.ts
    - pnpm verify:prepush
---

# VTX2 Substrait row-number window authoring evidence

## Scope

Issues #2641 and #2642 admit and expose the first bounded window vertical:

```text
existing single-source typed ProjectRel
  -> Expression.WindowFunction
  -> official functions_arithmetic/row_number() -> nullable i64
  -> one partition field + one ASC NULLS LAST ordering field
  -> stable row-number FieldId
```

The Canvas user chooses existing fields for partition and ordering, names the
row-number output, applies the edit, and reopens the same canonical semantic
document. Renaming or removing the window preserves every pre-existing FieldId.

## Architecture boundary

The implementation reuses `ConfigureCanvasDvtNode`, Workspace Graph Draft, and
`PreviewExecutionPlan`. Pinned Substrait v0.101.0
`Expression.rex_type.window_function`, the official `row_number` extension
identity, and core `i64` own semantic meaning. The DVT sidecar owns only stable
interactive identity. No `DvtWindow`, Web function enum, relation, store, or
runtime step is introduced.

The cut uses a standard window expression inside the existing `ProjectRel`.
It does not admit `ConsistentPartitionWindowRel`, which the pinned protobuf
places among physical relations. PostgreSQL SQL is a derived target projection:

```sql
select customer_name,
       email,
       country,
       row_number() over (
         partition by country
         order by name asc nulls last
       ) as country_row_number
from public.customers
```

Wrong extension URNs, function names/signatures, output types, phases,
invocations, sort directions, frames, output mappings, or sidecar bindings fail
closed. Aggregate/window composition, rank functions, multiple keys, custom
frames, and dbt projection/import remain outside this cut.

## Product evidence

The headed Chrome E2E selects `country` as partition, `name` as ordering,
enters `country_row_number`, activates the canonical edit by keyboard, applies
through the existing Inspector, verifies the saved typed Plan, reloads the
route, and confirms the same partition, ordering, output name, and fourth card
field. Focused tests also prove reversible removal, stable identity, exact
catalog admission, deterministic PostgreSQL rendering, Preview artifact
routing, card projection, and negative conformance.

No SQL/dbt import, second semantic authority, new command/query rail, generic
window editor, fake adapter, or placeholder is introduced.
