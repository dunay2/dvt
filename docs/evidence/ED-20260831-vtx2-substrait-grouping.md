---
title: VTX2 Substrait grouping and count authoring evidence
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
  - apps/web/src/app/views/canvas/canvasDvtSubstraitAggregation.ts
  - apps/web/src/app/views/canvas/DvtSubstraitPilotAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/views/canvas/canvasPreviewProvenance.ts
  - apps/web/cypress/e2e/canvas/canvas-substrait-grouping.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web exec node ../../tools/ci/run-web-cypress-native.mjs run --browser chrome --headed --spec cypress/e2e/canvas/canvas-substrait-grouping.cy.ts
    - pnpm verify:prepush
---

# VTX2 Substrait grouping and count authoring evidence

## Scope

Issues #2641 and #2642 admit and expose the first bounded aggregation vertical:

```text
existing single-source typed ProjectRel
  -> one AggregateRel grouping expression
  -> official functions_aggregate_generic/count() -> i64
  -> stable grain FieldId + stable count FieldId
```

The Canvas user chooses one existing output as the grain field, names the row
count output, applies the edit, and reopens the same canonical semantic
document. Removing the summary restores the prior ProjectRel without changing
the grain field identity.

## Architecture boundary

The implementation reuses `ConfigureCanvasDvtNode`, Workspace Graph Draft, and
`PreviewExecutionPlan`. Substrait v0.101.0 `AggregateRel`, the official `count`
extension identity, and core `i64` own semantic meaning. The DVT sidecar owns
only stable interactive identity. The UI reads the admitted capability ID from
the canonical catalog and does not persist a Web operator/function model.

PostgreSQL SQL is derived from the admitted Plan as a target projection:

```sql
select country as country, count(*) as customer_count
from public.customers
group by country
```

Malformed grouping sets, filters, count signatures, phases, invocation modes,
types, relation bindings, or sidecar output bindings fail closed. `SUM`,
multiple grouping sets, `HAVING`, windows, and dbt projection/import remain
unadmitted and outside this cut.

## Product evidence

The headed Chrome E2E selects `country`, enters `customer_count`, activates the
same summarize command by keyboard, applies through the existing Inspector,
verifies the persisted typed Plan, reloads the route, and confirms that Node
Properties reopens the same grain and count fields. Focused tests also prove
stable identity, reversible removal, card column projection, deterministic
PostgreSQL rendering, Preview artifact routing, and negative admission.

No new store, service, runtime step, semantic registry, SQL/dbt import path, or
parallel editable authority is introduced.
