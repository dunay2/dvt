---
title: UNION DISTINCT through the canonical relational tree and PostgreSQL runtime corridor
status: Accepted
date: 2026-09-19
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
  - apps/api/src/application/services/resolveDvtTerminalTransformClosure.ts
  - apps/api/src/application/services/dvtPostgresTransformProjection.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.ts
  - apps/web/src/app/views/canvas/canvasRelationalOperationChoices.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api test
    - pnpm --filter '@dvt/web' test
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-substrait-union-distinct.cy.ts
    - pnpm verify:prepush
---

# UNION DISTINCT end to end

## Authority and solution rationale

[Issue #3317](https://github.com/dunay2/dvt/issues/3317), ADR-0064, the
command/query rail governance, the Substrait capability-admission catalogue,
and Planning DB mechanization `GH-3317-UNION-DISTINCT-END-TO-END` govern this
slice. It reuses `ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`,
`PreviewPlan`, and `StartRun`; no parallel command, query, store, or execution
path is introduced.

```text
Canvas relational operation
  -> exact SetOp.SET_OP_UNION_DISTINCT
  -> ConfigureCanvasDvtNode / CAS
  -> DvtSubstraitSemanticDocumentV1 (canonical authority)
  -> ProjectCanvasRelationalTree (ordered inputs and set-semantics label)
  -> shared PostgreSQL Set-family projection
  -> PreviewPlan | StartRun
  -> PostgreSQL UNION in one governed workload
```

SQL remains a target projection of canonical Substrait. Duplicate elimination,
including PostgreSQL's equality treatment for complete tuples containing NULL,
comes from exact `UNION` semantics and is never simulated by a Web filter,
aggregate, or deduplication side effect.

## Implemented behavior

- The exact `SetOp.SET_OP_UNION_DISTINCT` selector is admitted independently of
  the existing `UNION_ALL` selector and all other Set selectors remain rejected.
- The shared N-input Set constructor and reader preserve N >= 2 ordered,
  distinct source identities; one PostgreSQL connection; identical non-empty
  ordered schemas; stable RelationId/FieldId bindings; selected output aliases;
  and the exact ALL versus DISTINCT selector through save/reload.
- PostgreSQL maps `UNION_ALL` to `SETOP_UNION` with `all: true` and
  `UNION_DISTINCT` to the same AST with `all: false`. It never silently falls
  back from DISTINCT to ALL.
- Protected Preview and Run use `dvt.vtx2.postgres.set.v1`, exact selected graph
  identity, content-addressed SQL, and the existing operational workload
  projector. Stale hashes, missing sources, changed physical bindings,
  incompatible schemas/connections, and unsupported selectors fail closed.
- Canvas exposes UNION DISTINCT through the same admitted operation shelf,
  drag payload, local Apply/Cancel draft, contextual tree, output selection,
  grouping/window wrappers, removal flow, composition badge, persistence, and
  selected-operation Preview rail used by UNION ALL while retaining the exact
  DISTINCT selector.

## Validation evidence

- Contract tests prove independent capability admission and workload-profile
  cardinality for two and three Set inputs.
- Shared projection tests prove ordered N=3 PostgreSQL `UNION`, unchanged
  `UNION ALL`, PostgreSQL DISTINCT set comparison for tuples containing NULL,
  selected outputs, and fail-closed schema, identity, hash, and selector
  boundaries.
- Protected API tests prove both Preview and Run lower the same persisted
  semantic document into one Set-profile workload and never publish SQL after a
  closure-integrity failure.
- Web unit, presentation, architecture, and native browser tests cover exact
  selection, keyboard-equivalent button activation, save/reload, tree/badge
  truth, SQL projection, drag authoring, and existing UNION ALL regression.
- The final lint, typecheck, docs governance, ARC, and repository pre-push
  results are recorded in issue #3317 and its implementation PR.

## Compatibility, rollout, and no-debt posture

Deploy contracts/shared projection and API before Web. Existing UNION ALL
documents and their producer identity remain valid. Consumers continue to fail
closed on unsupported selectors; only UNION DISTINCT enters the admitted
profile in this slice.

No second Set model, SQL authoring path, compatibility alias, placeholder, fake
adapter, rule relaxation, hook bypass, or hidden skipped validation is added.
