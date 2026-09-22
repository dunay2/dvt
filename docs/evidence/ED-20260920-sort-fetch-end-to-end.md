---
title: Ordered relation and bounded row selection through Substrait SortRel and FetchRel
status: Accepted
date: 2026-09-20
owners:
  - dvt-web
  - dvt-api
  - '@dvt/contracts'
  - '@dvt/postgres-projection'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/postgres-projection/src/substraitSortFetch.ts
  - packages/@dvt/postgres-projection/src/sortFetchPostgresProjection.ts
  - apps/api/src/application/services/dvtPostgresTransformProjection.ts
  - apps/api/src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitSortFetch.ts
  - apps/web/src/app/views/canvas/canvasRelationalTreeProjection.ts
  - apps/web/src/app/views/canvas/canvasRelationalTreeRelationProjection.ts
  - apps/web/src/app/views/canvas/CanvasRelationalTreeExpressionOperatorEditor.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalTreeSortFetchEditor.tsx
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter '@dvt/web' test
    - pnpm --filter '@dvt/web' typecheck
    - pnpm --dir apps/web test:e2e:native --spec cypress/e2e/canvas/canvas-relational-tree-operators.cy.ts
    - DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm -C apps/api exec vitest run --config vitest.integration.config.ts test/integration/dvtSortFetchPostgres.integration.test.ts
    - pnpm verify:prepush
---

# SortRel and FetchRel end to end

## Authority and solution rationale

[Issue #3324](https://github.com/dunay2/dvt/issues/3324), ADR-0064, the
command/query rail governance, the Substrait capability catalogue, and Planning
DB design `GH-3296-SEMANTIC-EDITOR-PRODUCT-V1` govern this slice. It reuses
`ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`,
`PreviewCanvasTransformRows`, `PreviewPlan`, and `StartRun`. Substrait remains
the semantic authority; SQL and the Canvas tree are projections.

The slice also follows
[Fowler Opportunity Planning Governance](../architecture/fowler-opportunity-planning-governance.md):
it removes responsibility overload from the tree projection, keeps authority
out of UI state and SQL strings, and proves the visible flow beyond isolated
operator tests.

| Scenario                                                  | Opportunity             | Fowler pattern                 | DDD owner                        | Command/query rail                    | Implementation surfaces                      | Unit or package test       | Architecture test                    | User-flow test                 | Out of scope                            |
| --------------------------------------------------------- | ----------------------- | ------------------------------ | -------------------------------- | ------------------------------------- | -------------------------------------------- | -------------------------- | ------------------------------------ | ------------------------------ | --------------------------------------- |
| Author, reopen, edit, and remove ordered/bounded wrappers | Hidden authority        | Value object and Service Layer | `DvtSubstraitSemanticDocumentV1` | `ConfigureCanvasDvtNode` command      | Web semantic authoring and contextual editor | Sort/Fetch authoring tests | Canvas workbench boundaries          | Cypress relational operators   | TopN and WITH TIES                      |
| Render SortRel and FetchRel in the canonical tree         | Responsibility overload | Read Model and Extract Class   | `CanvasRelationalTreeProjection` | `ProjectCanvasRelationalTree` query   | Web relation-tree projection                 | Projection shape tests     | Projection and workbench size guards | Cypress save/reopen flow       | Alternate visual AST                    |
| Preview a selected operation and the complete Model       | Duplicate semantics     | Mapper and Gateway             | `CanvasTransformDataSample`      | `PreviewCanvasTransformRows` query    | API dispatcher, PostgreSQL AST, sample probe | API and projection tests   | Existing rail guards                 | Cypress selected preview       | Browser-side ordering                   |
| Execute the persisted document with identical semantics   | Test-only confidence    | Service Layer                  | DVT operational workload         | `PreviewPlan` and `StartRun` commands | Existing API workload projection             | Preview/Run parity tests   | Existing execution boundaries        | PostgreSQL integration fixture | New endpoint, workload, or result store |

```text
Canvas contextual editor
  -> SortRel(field references, explicit direction and NULL placement)
  -> FetchRel(optional literal i64 offset/count)
  -> ConfigureCanvasDvtNode / CAS
  -> canonical DvtSubstraitSemanticDocumentV1
  -> recursive relation dispatcher by relType
       -> existing Project/Join/Cross/Set PostgreSQL AST
       -> Sort/Fetch PostgreSQL AST wrappers
  -> PreviewCanvasTransformRows | PreviewPlan | StartRun
  -> PostgreSQL ordered sequence
```

The wrappers are applied in canonical tree order and are never pushed through
another relation. In particular:

```text
Fetch(Sort(R)) != Sort(Fetch(R))
Filter(Fetch(Sort(R))) != Fetch(Sort(Filter(R)))
Fetch(Sort(UnionAll(A,B))) != UnionAll(Fetch(A),Fetch(B))
```

## Bounded admitted profile

- Sort requires at least one key. Each key is a direct field reference resolved
  through the selected relation's stable sidecar FieldId and current output
  ordinal.
- The admitted directions are `ASC_NULLS_FIRST`, `ASC_NULLS_LAST`,
  `DESC_NULLS_FIRST`, and `DESC_NULLS_LAST`. Unspecified, clustered, comparison
  functions, and non-field expressions fail closed.
- Fetch accepts only absent/NULL or literal i64 expressions. Offset defaults to
  zero, count defaults to unlimited, and zero count returns no rows. Negative
  values and values outside signed i64 fail closed.
- Bigint remains exact from form parsing through protobuf and PostgreSQL AST;
  values are not coerced through JavaScript `number`.
- Sort and Fetch preserve the input schema and stable FieldIds. They do not
  infer uniqueness, append hidden tie-breakers, or promise repeatability for
  unresolved ties or changing source data.

## Preview order contract

The provider sample cap is distinct from semantic Fetch. Preview adds only the
outer `limit + 1` used to derive `truncated`; it never rewrites Fetch, limits an
input before Sort, or reorders rows in the browser. The projector exposes the
final admitted ordering to the sample probe, which repeats that ordering at the
outer query boundary. Run executes the same semantic projection without the
sample cap.

## Required proof

The canonical PostgreSQL fixture compares returned sequences, including
`ORDER BY amount DESC NULLS LAST, id ASC` producing
`[10,40,70,30,50,80,20,60]` and `LIMIT 3 OFFSET 2` producing `[70,30,50]`.
Coverage also includes all four direction/NULL combinations, multiple-key
priority, duplicates, count zero, absent values, exact i64 boundaries, nested
wrappers, Set and Join inputs, selected-operation Preview, save/reload,
Preview/Run parity, invalid forms, and preservation of earlier relation
families.

The browser regression additionally proves that an applied
`Fetch(Sort(Join(...)))` remains discoverable after reload, that the inner Sort
can be edited or removed by stable RelationId, and that removing it retains the
outer Fetch and the underlying JOIN classification. Exact bigint comparison in
the local authoring transaction does not use JSON number coercion.

## Compatibility and no-debt posture

Existing semantic documents remain valid. Older runtimes reject the newly
admitted relation roots instead of guessing their semantics. This slice adds no
parallel AST, SQL-authoring path, endpoint, StepKind, result store, client-side
sort, placeholder, or compatibility alias.
