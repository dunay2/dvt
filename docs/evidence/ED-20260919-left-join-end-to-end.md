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
- The chooser, initial authoring flow, drag model, existing-tree editor,
  per-stage type selector, L/R preservation hint, node label, Canvas badge,
  save/reload restoration and keyboard activation all derive LEFT from admitted
  or canonical truth. Read-only operation choices remain unavailable for writes.

## Validation evidence and observed failures

- Contract suite: 64 files and 628 tests passed. Its first run exposed two stale
  fixture uses of the retired `inner-join` workload identity; those producers now
  use the exported JOIN-family constant and the full rerun passed.
- PostgreSQL projection: 6 files and 27 tests passed, including exact INNER/LEFT
  stage mapping, unsupported selector rejection and output nullability.
- Canvas unit: 173 files and 1,091 tests passed. Canvas architecture: 63 files
  and 124 tests passed without increasing any module-size boundary.
- Native Cypress: 4 of 4 tests passed. The LEFT scenario selects and applies by
  keyboard, verifies canonical right-side null extension, displays `LEFT JOIN`,
  reloads, and proves the label remains canonical after persistence.
- API focused Preview/Run coverage passes for `LEFT(INNER(A,B),C)`. The complete
  API unit run passed 1,165 tests and skipped 27 conditional integration tests,
  but two unrelated dbt filesystem tests exceeded their five-second timeout
  while API and Web suites ran concurrently; both passed immediately in an
  isolated rerun (5 of 5). This is recorded as validation context, not hidden.
- Contracts, shared projection, API and Web typechecks pass. API and Web lint
  pass with no relaxed rule.

## Compatibility, rollout and no-debt posture

Deploy contracts/shared projection and API before Web. Persisted canonical
INNER documents remain valid. The operational profile rename is an intentional
hard cut inside the unreleased VTX2 corridor; old `inner-join` producers are not
accepted through a compatibility alias. Exact JOIN semantics remain in the
canonical Substrait document, so extending the family does not require another
workload profile.

No new debt item, placeholder, fake adapter, raw-SQL authority, second JOIN AST,
rule relaxation, hook bypass or hidden skipped check was introduced. The next
family extension is #3308; it must consume this shared seam and must not normalize
RIGHT into LEFT by swapping operands.
