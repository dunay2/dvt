---
title: Algebraic derived output evidence
status: Accepted
date: 2026-09-08
owners:
  - web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalogSchema.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/plugins/graph/GraphNodeColumnDropCompositionFlow.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm golden:validate
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasColumnFunctionAuthoring.test.ts src/app/views/canvas/canvasDvtSubstraitPostgresProjection.test.ts src/app/plugins/graph/GraphNodeColumnSection.composition.test.tsx
    - pnpm --filter @dvt/web typecheck
    - node ../../tools/ci/run-web-cypress-native.mjs run --browser chrome --headed --spec cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
    - pnpm docs:feature-mechanization:implementation -- --feature GH-2921-ALGEBRAIC-DERIVED-OUTPUT
    - pnpm verify:prepush
---

# Algebraic derived output evidence

## Scope

Issue #2921 adds one bounded algebraic composition gesture to a Transform card:

```text
target FieldId + dragged FieldId
  -> compatible binary CONCAT
  -> required unique alias
  -> new FieldId
```

Both operands remain present and ordered. Apply appends one recursive Substrait
`ProjectRel` expression; Cancel, unsupported signatures, incompatible types, duplicate aliases,
unknown fields, self-drop, external dbt authority, and read-only scope leave the draft unchanged.

## Semantic and target boundary

Substrait owns the official variadic string signature `concat:str`. DVT admits a narrower
profile of exactly two ordered string operands with `ACCEPT_NULLS`; it does not define a
second expression language or capability registry. The PostgreSQL adapter projects the same
recursive expression through the governed AST and preserves null propagation.

The existing `ConfigureCanvasDvtNode` command remains the only write rail.
`DvtNodeAuthoringMetadata` owns the authored semantic revision, while the Substrait sidecar
preserves stable relation and field identity through reorder, reuse, save, and reload.
