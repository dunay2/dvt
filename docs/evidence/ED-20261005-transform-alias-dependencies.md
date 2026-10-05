---
title: Durable calculated-field dependencies inside one Transform
status: draft
date: 2026-10-05
owners:
  - apps/web
  - packages/@dvt/contracts
  - packages/@dvt/substrait-analysis
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/substrait-analysis/src/authoringGroup.ts
  - apps/web/src/app/views/canvas/canvasTransformDependencyModel.ts
  - apps/web/src/app/views/canvas/canvasTransformDependencyPlan.ts
  - apps/web/src/app/views/canvas/canvasSelectedRelationDerivedOutput.ts
  - apps/web/src/app/views/canvas/removeCanvasTransformDefinition.ts
  - apps/web/cypress/e2e/canvas/canvas-transform-stage.cy.ts
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/contracts/test packages/@dvt/substrait-analysis/test --maxWorkers=2 --minWorkers=1
    - pnpm --filter @dvt/web test:unit:run src/app/views/canvas/canvasTransformDependencies.test.ts src/app/views/canvas/canvasTransformDependencyTypes.test.ts
    - pnpm --filter @dvt/web test:unit:run src/app/views/canvas/canvasSourceColumnOutputAuthoring.test.ts
---

# Durable calculated-field dependencies inside one Transform

## Governance and rationale

Issue [#3593](https://github.com/dunay2/dvt/issues/3593) owns this slice.
Planning DB designs `GH-3593-TRANSFORM-ALIAS-DEPENDENCIES` and
`GH-3593-INTEGRATION-EVIDENCE` admit its implementation and integration evidence.
`GH-3593-BROWSER-ROUTING` admits the bounded existing-runtime registration.
The approved diagrams and Fowler opportunities are recorded in the
[design discussion](https://github.com/dunay2/dvt/issues/3593#issuecomment-6000710477).
The existing ConfigureCanvasDvtNode, SaveWorkspaceGraphDraft,
ProjectCanvasRelationalTree and PreviewCanvasTransformRows rails retain ownership.
[ADR-0064](../adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md)
governs canonical semantic authority. V1 identity metadata groups internal
ProjectRel layers; it does not contain a second expression AST.

```text
Input -> independent definitions -> dependent definitions -> selected outputs
           same-depth ProjectRel       next ProjectRel        public root
           \_________________ one authored Transform _________________/
```

Previously, referring to an output could copy its expression into a consumer.
The new command binds an alias to a stable definition identity and lowers its
dependencies into ordinary canonical ProjectRel layers. Independent calculations
share a layer. Public output identities remain distinct from internal producers.
Renaming or changing output order does not change dependency identity. Editing a
producer updates dependent computation after serialization and reload.

Hiding an output only changes publication. Its retained definition can still be
edited, referenced and deleted explicitly. Deleting a referenced definition,
cycles, ambiguous names and incompatible dependent type changes fail atomically.
Typed errors carry codes and field context; the existing EN/ES presentation owns
the translated explanation and retains the rejected formula for correction.

## Integration and removed paths

Read models group only explicitly owned contiguous layers; unrelated adjacent
Projects remain separate cards. Duplication remaps group owners and operand
identities. Staged restoration, expression deletion, output inspection and source
publication use canonical analysis rather than assuming one Project per card.
Source publication still protects hidden computations but does not lock unused
columns merely transported by an internal layer.

The old expression-copy resolver is removed. Formula rendering is shared between
the editor and Output, without introducing another semantic model. Output
inspection and source dependency checks no longer use the narrow legacy
projection inspector. The latter remains only where its admitted legacy profile
is still the actual contract; negative tests first prove their fixture is valid.

## Validation record

- Contracts and analysis: 931 tests passed across 93 files; builds and scoped
  lint passed.
- Mutation and typed dependency tests: 30 passed, including producer edits,
  stable identities, hidden definitions, cycles, type conflict and layer movement.
- Staged composition and semantic chains: 59 passed after replacing assertions
  that assumed one physical Project with assertions on the explicit group.
- Deletion, field selection and card projection: 113 unit and 27 presentation
  checks passed. Duplicator: six passed, including independent group identities
  after serialized reload.
- Calculated-column authoring: 11 passed. Formula lineage: 13 passed, including
  six legacy negative cases with a positive admission guard.
- Source dependency regression: the new case failed before the correction;
  all nine cases passed afterward, protecting hidden dependencies while allowing
  removal of an unused source field.
- Full Web unit run: 401 files and 2726 tests passed. Full architecture: 114 files
  and 434 tests passed after removing redundant layout assignments and admitting
  the Transform journey in the existing governed browser runtime.
- PostgreSQL projection: all 269 tests passed. Contracts and analysis typechecks,
  contract schema synchronization (25 tests), Web typecheck, package lint and
  strict changed-file lint passed.
- Full presentation ran 1459 tests: 1456 passed and three assertions still used
  the narrow legacy inspector. Two were corrected and passed in the 16-case
  edge-authoring suite; the command-runner assertion is being corrected.
- Native-browser acceptance initially passed one of three journeys. The failed
  journeys exposed an obsolete Output description assertion and an extra quote
  inserted by the test's Monaco typing sequence. A later run identified an
  incorrect test assumption about direct edits versus staged Apply. Existing
  Transform edits use direct save; pending Transform edits use Apply. The new
  dependency journey must prove the former without changing persistence policy,
  while the existing journey continues to prove the latter. Final browser proof,
  validation, exact-SHA DB acceptance, pre-push and CI remain required.

Browser tests use controlled HTTP transport and real client commands, canonical
save payloads and SQL lowering. They are not live-provider execution evidence.

## Development hard cut and no-debt boundary

This extends the single V1 contract, with no V2 or migration. Deploy readers and
writers together; an older reader must reject unfamiliar grouping metadata rather
than silently interpreting it. Existing copied expressions remain independent:
the implementation does not guess dependencies from equal expression text.

No hooks or validation rules are disabled. No stub, fake success, compatibility
facade or new debt entry is introduced. The
[dependency integrity risk](../risk-register/quality/R-20261005-TRANSFORM-DEPENDENCIES.yaml)
records the integrity boundary and its mitigations. Unrelated local work and the
user's running application are not replaced by this isolated worktree.
