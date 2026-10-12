---
title: INTERSECT and EXCEPT DISTINCT through the canonical Set family and PostgreSQL runtime
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
  - packages/@dvt/postgres-projection/src/substraitSetReader.ts
  - packages/@dvt/postgres-projection/src/setPostgresProjection.ts
  - apps/api/test/integration/dvtSetDistinctPostgres.integration.test.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.ts
  - apps/web/src/app/views/canvas/canvasRelationalOperationChoices.ts
  - apps/web/cypress/e2e/canvas/canvas-substrait-set-distinct.cy.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter '@dvt/web' typecheck
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-substrait-set-distinct.cy.ts
    - DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm -C apps/api exec vitest run --config vitest.integration.config.ts test/integration/dvtSetDistinctPostgres.integration.test.ts
    - pnpm verify:prepush
---

# INTERSECT and EXCEPT DISTINCT end to end

## Authority and solution rationale

[Issue #3318](https://github.com/dunay2/dvt/issues/3318), ADR-0064, command/query
rail governance, the Substrait capability-admission catalogue, and Planning DB
mechanization `GH-3318-INTERSECT-EXCEPT-DISTINCT-END-TO-END` govern this slice.
It reuses `ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`, `PreviewPlan`,
and `StartRun`; no parallel command, query, semantic tree, store, or execution
path is introduced.

```text
Canvas Set operation
  -> INTERSECTION_MULTISET | MINUS_PRIMARY
  -> ConfigureCanvasDvtNode / CAS
  -> canonical DvtSubstraitSemanticDocumentV1
  -> ProjectCanvasRelationalTree
  -> shared Set-family inspection and PostgreSQL AST projection
  -> PreviewPlan | StartRun
  -> PostgreSQL INTERSECT | EXCEPT
```

Substrait remains the semantic authority and SQL remains a target projection.
`INTERSECTION_PRIMARY` and `MINUS_MULTISET`, which express the separate ALL-like
semantics, remain unsupported and fail closed.

## Implemented behavior

- `SetOp.SET_OP_INTERSECTION_MULTISET` maps exactly to N-input PostgreSQL
  `INTERSECT`, and `SetOp.SET_OP_MINUS_PRIMARY` maps exactly to left-associated
  N-input PostgreSQL `EXCEPT`.
- The existing Set-family constructor, reader, sidecar identities, persistence,
  tree projection, operation shelf, Apply/Cancel draft, wrappers, and removal
  flow carry the exact selector through save and reload.
- Set comparison always uses the complete aligned input tuple. A selected output
  projection is applied outside the Set expression, so `project(Set(A, B))` is
  never changed into `Set(project(A), project(B))`.
- INTERSECT output nullability is nullable only when every input can emit null;
  EXCEPT preserves the primary input nullability. Ordered names and types must
  align; implicit coercion and name-based realignment are not introduced.
- Protected Preview and Run reuse the existing Set workload profile and content-
  addressed semantic document. Unsupported selectors, stale identity, schema or
  connection drift, repeated sources, and invalid arity continue to fail closed.

## Validation evidence

- Contract tests admit only the two exact DISTINCT selectors and retain negative
  coverage for their ALL counterparts.
- Shared projection tests cover N=3, tuple comparison, nullability, selected
  operation rebasing, Aggregate/Window wrappers, empty inputs, incompatible
  schemas, and exact PostgreSQL AST operators.
- API tests prove Preview and Run project the persisted INTERSECT and EXCEPT
  documents through the same workload rail.
- Six real-PostgreSQL integration scenarios passed, including duplicate and NULL
  semantics, N=3 intersection, primary-oriented subtraction, empty primary
  input, and both projection-placement differential cases.
- Native Cypress passed two complete author-save-reload scenarios, one for each
  operation, including contextual presentation after persistence.
- Package typechecks and the final repository pre-push gate are part of the
  candidate-SHA closeout and are reported in the implementation PR.

## Compatibility, rollout, and no-debt posture

Existing UNION ALL and UNION DISTINCT selectors, producer identities, and
persisted documents remain valid. Contracts/shared projection and API should be
deployed before Web so an older runtime continues to reject the new selectors
instead of mis-executing them.

No second Set model, SQL authoring path, compatibility alias, fake adapter,
placeholder, rule relaxation, hook bypass, or hidden skipped validation is
introduced. ALL variants and schema coercion remain separate governed work.
