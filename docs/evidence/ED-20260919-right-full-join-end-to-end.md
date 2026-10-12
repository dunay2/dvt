---
title: RIGHT and FULL OUTER JOIN through the canonical relational tree and PostgreSQL runtime corridor
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
  - packages/@dvt/postgres-projection/src/substraitJoinReadModel.ts
  - packages/@dvt/postgres-projection/src/substraitJoinReader.ts
  - packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
  - apps/api/test/application/services/dvtNInputPreview.test.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
  - apps/web/src/app/views/canvas/CanvasRelationalTreeJoinEditor.tsx
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dvtNInputPreview.test.ts
    - pnpm --filter '@dvt/web' test:canvas-unit:run
    - pnpm --filter '@dvt/web' test:canvas-presentation:run
    - pnpm --filter '@dvt/web' test:canvas-architecture:run
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    - pnpm verify:prepush
---

# RIGHT and FULL OUTER JOIN end to end

## Authority and solution rationale

[Issue #3308](https://github.com/dunay2/dvt/issues/3308), ADR-0064, the
command/query rail governance, the capability-admission catalogue, and Planning
DB mechanization `GH-3308-RIGHT-FULL-JOIN-END-TO-END` govern this slice. The
existing `ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`, `PreviewPlan`,
and `StartRun` rails are reused. No parallel command, query, persistence, or
execution path was introduced.

```text
Canvas relational operation
  -> exact JOIN_TYPE_RIGHT | JOIN_TYPE_OUTER per stage
  -> ConfigureCanvasDvtNode / CAS
  -> DvtSubstraitSemanticDocumentV1 (canonical authority)
  -> ProjectCanvasRelationalTree (exact label, L/R roles and nullability)
  -> shared PostgreSQL JOIN-family projection
  -> PreviewPlan | StartRun
  -> RIGHT JOIN | FULL JOIN in one governed PostgreSQL workload
```

RIGHT is not normalized into LEFT by swapping operands. Input order, predicate
field identity, RelationId and FieldId remain stable. SQL is a target projection
of canonical Substrait and never becomes authoring authority.

## Implemented behavior

- `JOIN_TYPE_RIGHT` and `JOIN_TYPE_OUTER` are admitted through the canonical
  capability catalogue with PostgreSQL conformance and visual exposure.
- The shared JOIN-family reader accepts INNER, LEFT, RIGHT and OUTER, rejects
  other selectors, and projects cumulative nullability by field provenance:
  INNER preserves both sides, LEFT widens R, RIGHT widens L, and OUTER widens
  both.
- Required mixed trees retain exact stage types and effective nullability:
  `RIGHT(LEFT(A,B),C)`, `OUTER(INNER(A,B),C)`, and `LEFT(RIGHT(A,B),C)`.
- PostgreSQL maps the exact final-stage semantics to `JOIN_RIGHT` and
  `JOIN_FULL`. Protected Preview and Run use the existing
  `dvt.vtx2.postgres.join.v1` workload profile and publish real `RIGHT JOIN` and
  `FULL JOIN` SQL.
- Canvas exposes both operations through the admitted operation shelf, initial
  authoring, drag payload, existing-tree stage selector, contextual editor,
  exact L/R role hint, node labels, composition badge, save/reload restoration,
  and removal flow.
- The persisted authoring shape remains exact (`right_join` or
  `full_outer_join`); reconnecting or reopening a Model does not collapse it to
  INNER or LEFT.

## Validation evidence

- Contract admission passes 630 tests; the shared PostgreSQL reader and
  projection pass 29 tests with exact RIGHT/FULL SQL, mixed-tree round-trip and
  cumulative nullability assertions.
- The complete protected API suite passes 1,171 tests, with 27 conditional
  tests skipped. Its JOIN-family proof covers Preview and Run for LEFT, RIGHT
  and FULL through the same workload profile.
- The complete Web suite passes 1,903 unit tests, 1,137 presentation tests and
  307 architecture tests. Web lint and typecheck also pass.
- The native Canvas browser proof passes all six scenarios, including exact
  RIGHT and FULL authoring, save/reload restoration and nullability labels.
- Contracts, PostgreSQL projection and API typechecks pass; API lint passes.
  The final repository pre-push result is recorded in the governing issue and
  PR closeout after the hook-normalized commit.

## Compatibility, rollout and no-debt posture

Deploy contracts/shared projection and API before Web. Existing INNER and LEFT
documents remain valid and byte-compatible. Consumers that reject unsupported
selectors continue to fail closed; only RIGHT and OUTER enter the admitted
profile in this slice.

No second JOIN model, SQL authoring path, compatibility alias, placeholder,
fake adapter, rule relaxation, hook bypass, or hidden skipped validation was
introduced.
