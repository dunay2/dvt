---
title: Timestamp column function evidence
status: Accepted
date: 2026-09-10
owners:
  - web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/plugins/graph/GraphNodeColumnRow.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasDvtSubstraitPostgresProjection.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx
    - pnpm --filter @dvt/web typecheck
    - node ../../tools/ci/run-web-cypress-native.mjs run --browser chrome --headed --spec cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
    - pnpm docs:feature-mechanization:implementation -- --feature GH-3101-TIMESTAMP-COLUMN-FUNCTION
    - pnpm verify:prepush
---

# Timestamp column function evidence

## Scope

Issue #3101 admits one bounded function for PostgreSQL `timestamp with time zone` Model outputs:

```text
occurred_at
  -> EXTRACT YEAR (UTC)
  -> occurred_year: bigint
```

The pointer and keyboard menu resolve the option from the canonical Substrait catalog. Apply keeps
the selected output, requires an alias, appends a new FieldId, focuses it, persists it, and restores
the same inspected expression after reload.

## Semantic and target boundary

The canonical plan uses Substrait v0.101.0 `functions_datetime.extract` with the exact
`extract:req_ptstz_str` signature, enum `YEAR`, the selected field and literal timezone `UTC`.
PostgreSQL renders the same expression through the governed AST and casts the result to `bigint`.

Unsupported types, providers, capabilities, malformed arguments, duplicate aliases and unknown
FieldIds write nothing. No second function registry, AST, store, API, free-form SQL or implicit text
coercion is introduced.
