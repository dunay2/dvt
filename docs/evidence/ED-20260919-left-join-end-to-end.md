---
title: LEFT JOIN through the canonical relational tree and PostgreSQL runtime corridor
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
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.shared.ts
  - packages/@dvt/postgres-projection/src/substraitJoinReadModel.ts
  - packages/@dvt/postgres-projection/src/substraitJoinReader.ts
  - packages/@dvt/postgres-projection/src/joinPostgresProjection.ts
  - apps/api/src/application/services/resolveDvtTerminalTransformClosure.ts
  - apps/api/test/integration/dvtWrappedLeftJoinPostgres.integration.test.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
  - apps/web/src/app/views/canvas/CanvasRelationalTreeJoinEditor.tsx
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtWrappedLeftJoinPostgres.integration.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dvtNInputPreview.test.ts
    - pnpm --filter '@dvt/web' test:canvas-unit:run
    - pnpm --filter '@dvt/web' test:canvas-presentation:run
    - pnpm --filter '@dvt/web' test:canvas-architecture:run
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts
    - pnpm verify:prepush
---

# LEFT JOIN end to end

## Authority and solution rationale

[Issue #3307](https://github.com/dunay2/dvt/issues/3307), ADR-0064, the
command/query rail governance, the capability-admission catalogue, and Planning
DB mechanization `GH-3307-LEFT-JOIN-END-TO-END` govern this slice. The existing
rails are reused: `ConfigureCanvasDvtNode`, `ProjectCanvasRelationalTree`,
`PreviewPlan`, and `StartRun`. No parallel write, query, or execution rail was
introduced.

```text
Canvas local JOIN draft
  -> ConfigureCanvasDvtNode / CAS
  -> DvtSubstraitSemanticDocumentV1 (canonical authority)
       stage 1: INNER(A, B)
       stage 2: LEFT(stage 1, C)
  -> ProjectCanvasRelationalTree (exact stage labels and L/R roles)
  -> shared PostgreSQL JOIN-family projection
  -> PreviewPlan | StartRun
  -> one governed PostgreSQL workload
```

The exact `JoinRel.type` is stored on every stage. SQL, badges, tree labels,
effective output nullability, the workload profile and persisted authoring shape
are projections of that semantic document. Canvas position, display names and
source count do not choose JOIN orientation or type.

## Implemented behavior

- `JOIN_TYPE_LEFT` is admitted as a supported profile with typed contract
  evidence. RIGHT, OUTER, SEMI, ANTI, SINGLE and MARK remain fail-closed.
- The INNER-only shared draft/reader names were replaced by one JOIN-family
  model. Direct consumers migrated in the same hard cut; no alias or duplicate
  registry remains.
- The existing INNER producer path is retained for all-INNER documents, keeping
  unchanged INNER semantic bytes stable. Mixed trees carry an exact type for
  each stage and preserve surviving RelationId/FieldId identities.
- LEFT null extension is projected from provenance: left-subtree nullability is
  preserved and every right-origin output becomes nullable. PostgreSQL renders
  real `LEFT JOIN ... ON ...` AST nodes and exposes the same facts in its target
  schema.
- One operational identity, `dvt.vtx2.postgres.join.v1`, covers the admitted
  JOIN family. The closure resolver derives it from canonical relation semantics,
  and the same resolver feeds protected Preview, selected-operation preview and
  Run workload construction.
- Preview v1 and Run v2 workloads persisted with the superseded
  `dvt.vtx2.postgres.inner-join.v1` identity are normalized at their bounded
  contract read seam to `dvt.vtx2.postgres.join.v1`. Current producers still
  emit only the JOIN-family identity; the historical value is not exported as a
  second capability authority.
- Grouping and grouped-window wrappers lower their input through the same
  JOIN-family projector as the unwrapped relation. A binary LEFT therefore
  remains `LEFT JOIN` under both wrappers instead of entering the retired
  INNER-only builder.
- The chooser, initial authoring flow, drag model, existing-tree editor,
  per-stage type selector, L/R preservation hint, node label, Canvas badge,
  save/reload restoration and keyboard activation all derive LEFT from admitted
  or canonical truth. Read-only operation choices remain unavailable for writes.

## Corrective validation evidence

- Contract suite: 64 files and 641 tests passed, including Preview v1 and Run v2
  historical-profile normalization through the registered workload contract.
- PostgreSQL projection: 8 files and 51 tests passed. The Web projection's 39
  focused tests prove exact LEFT rendering under grouping and grouped Window.
- PostgreSQL 15 integration: 2 of 2 real queries passed. Both wrappers retained
  the unmatched left row produced by the canonical binary LEFT plan.
- API unit: 210 files and 1,188 tests passed, with 27 conditional tests skipped
  by their existing environment gates. The focused Run binding test proves a
  historical workload reaches governed dispatch instead of `plan_rejected`.
- Web unit: 313 files and 1,936 tests; presentation: 242 files and 1,148 tests;
  architecture: 108 files and 307 tests. All passed. Existing React `act(...)`
  and zero-sized chart warnings remained non-failing and were not hidden.
- Contracts, API and Web typechecks pass. API and Web lint pass with no relaxed
  rule. `pnpm verify:prepush` is the final hook-normalized integration gate.

## Compatibility, rollout and no-debt posture

Deploy contracts/shared projection and API before Web. Persisted canonical
INNER documents remain valid. Historical workload input is migrated once at
the contract read seam, while all output remains on the current JOIN-family
profile. Exact JOIN semantics remain in the canonical Substrait document, so
extending the family does not require another workload profile.

No new debt item, placeholder, fake adapter, raw-SQL authority, second JOIN AST,
rule relaxation, hook bypass or hidden skipped check was introduced. The next
family extension is #3308; it must consume this shared seam and must not normalize
RIGHT into LEFT by swapping operands.
