---
title: INTERSECT ALL and EXCEPT ALL through the canonical Set family and PostgreSQL runtime
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
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter '@dvt/web' test
    - pnpm --filter '@dvt/web' typecheck
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-substrait-set-distinct.cy.ts
    - DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm -C apps/api exec vitest run --config vitest.integration.config.ts test/integration/dvtSetDistinctPostgres.integration.test.ts
    - pnpm verify:prepush
---

# INTERSECT ALL and EXCEPT ALL end to end

## Authority and solution rationale

[Issue #3319](https://github.com/dunay2/dvt/issues/3319), ADR-0064,
command/query rail governance, the Substrait capability catalogue, and Planning
DB mechanization `GH-3319-INTERSECT-EXCEPT-ALL-END-TO-END` govern this slice.
It reuses `ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`, `PreviewPlan`,
and `StartRun`; no parallel command, query, semantic tree, store, workload
profile, or execution path is introduced.

```text
Canvas Set operation
  -> INTERSECTION_MULTISET_ALL | MINUS_PRIMARY_ALL
  -> ConfigureCanvasDvtNode / CAS
  -> canonical DvtSubstraitSemanticDocumentV1
  -> ProjectCanvasRelationalTree
  -> shared Set-family inspection and PostgreSQL AST projection
  -> PreviewPlan | StartRun
  -> PostgreSQL INTERSECT ALL | EXCEPT ALL
```

The compositional-stabilization gate from issue #3330 was revalidated before
this capability resumed: wrapped LEFT JOIN, Set selection/wrappers, mixed CROSS
append/reopen, wrapper removal, shared drop geometry, and localized CROSS all
remain green. Substrait remains the semantic authority and SQL remains a target
projection.

## Implemented behavior

- `SetOp.SET_OP_INTERSECTION_MULTISET_ALL` maps exactly to N-input PostgreSQL
  `INTERSECT ALL`; `SetOp.SET_OP_MINUS_PRIMARY_ALL` maps exactly to
  left-associated N-input PostgreSQL `EXCEPT ALL`.
- Duplicate and NULL multiplicities are preserved. EXCEPT applies every
  secondary input in order and is not rewritten as subtraction by a grouped
  secondary relation.
- The existing Set-family constructor, reader, sidecar identities, persistence,
  tree projection, operation shelf, Apply/Cancel draft, wrappers, removal, and
  drag/drop flows carry the exact selector through save and reload.
- Set comparison uses the complete aligned input tuple. A selected output
  projection remains outside the Set expression, so `project(Set(A, B))` is not
  changed into `Set(project(A), project(B))`.
- INTERSECT ALL output nullability is nullable only when every input can emit
  null. EXCEPT ALL preserves the primary-input nullability. Ordered names and
  types must align; implicit coercion and name-based realignment are not added.
- Preview and Run reuse the existing Set workload profile. Unsupported
  selectors, stale identity, invalid arity, schema drift, and connection drift
  continue to fail closed before provider execution.

## Validation evidence

- Contract coverage admits only the two pinned ALL selectors while retaining
  rejection of unsupported Set variants.
- Shared projection coverage proves exact AST flags, N=3 association,
  nullability, selected-operation rebasing, Aggregate/Window wrappers, empty
  inputs, and incompatible-schema rejection.
- API coverage proves Preview and Run publish the same canonical ALL document
  and keep output projection outside the complete-tuple bag operation.
- Thirteen real-PostgreSQL Set scenarios pass. The ALL cases cover duplicate
  and NULL multiplicity, left-associated subtraction, a non-equivalent grouped
  subtraction oracle, empty primary input, and both projection-placement
  differentials.
- Native Cypress passes four author-save-reload scenarios: INTERSECT, EXCEPT,
  INTERSECT ALL, and EXCEPT ALL.
- Package suites, typechecks, lint, mechanization, and the repository pre-push
  gate are required on the candidate commit and are reported in the PR.

## Compatibility, rollout, and no-debt posture

Existing UNION and DISTINCT selectors, producer identities, persisted documents,
and workload profile remain valid. Contracts/shared projection and API should be
deployed before Web so an older runtime rejects the new selectors rather than
mis-executing them.

No second Set model, SQL-authoring path, compatibility alias, fake adapter,
placeholder, rule relaxation, hook bypass, or hidden skipped validation is
introduced. Schema coercion and additional Set variants remain separate governed
work.
