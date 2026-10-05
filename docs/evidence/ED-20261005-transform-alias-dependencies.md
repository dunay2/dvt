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
    - pnpm --filter @dvt/web test:e2e:native --browser electron --spec cypress/e2e/canvas/canvas-transform-stage.cy.ts
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
- Full Web unit run: 401 files and 2726 tests passed. The pre-commit architecture
  run passed 434 tests across 114 files after removing redundant layout assignments
  and admitting the Transform journey in the existing governed browser runtime.
  The later pre-push against hook-formatted commit `588b2b431` passed 1896 affected
  unit tests and 912 presentation tests, but failed two architecture size guards
  (114 lines against `<100`, and 211 against `<210`). Integration remained blocked;
  the limits were not relaxed. The correction reuses canonical graph projection
  directly and shares gesture rejection handling, removing redundant conversions
  and control flow. A subsequently reached inspector guard was corrected by
  reusing its existing semantic-context type, without changing runtime behavior.
  After hook formatting, commit `7b48f87e4` passed all 434 architecture tests;
  the three bounded files measured 99, 209 and 98 lines respectively. The final
  exact-SHA closeout receipt belongs on the issue and PR.
- PostgreSQL projection: all 269 tests passed. Contracts and analysis typechecks,
  contract schema synchronization (25 tests), Web typecheck, package lint and
  strict changed-file lint passed.
- Full presentation ran 1459 tests: 1456 passed and three assertions still used
  the narrow legacy inspector. All three were corrected, and the two affected
  files then passed together (20 tests), preserving serial execution, duplicate
  alias rejection, exact identities and unchanged state on rejection.
- Native-browser acceptance initially passed one of three journeys. The failed
  journeys exposed an obsolete Output description assertion and an extra quote
  inserted by the test's Monaco typing sequence. A later run identified an
  incorrect test assumption about direct edits versus staged Apply. Existing
  Transform edits use direct save; pending Transform edits use Apply. The new
  dependency journey must prove the former without changing persistence policy,
  while the existing journey continues to prove the latter. The corrected Chrome
  run passed all three journeys but stalled before reporting its final result;
  its owned Cypress process was terminated and its preview cleaned up. This is
  not recorded as a successful command. The supported Electron runtime then
  completed successfully with the same assertions: three passed, zero failed,
  pending or skipped, exit 0, 67 seconds. Its log and eight screenshots are in the
  isolated worktree under `.dvt/tmp/3593-transform-stage-electron.log` and
  `.dvt/evidence/3593-transform-stage-electron/screenshots`. The direct-edit journey
  proves exactly three successful saves, stable A/B identities and reference,
  updated SQL after reopening, and zero writes for the rejected cycle.
- Native Chrome 154 diagnostics reproduced the missing completion signal after
  `test end`, before `test:after:run`; a later attempt stalled in the first
  existing test. No active dialog was observed and no root cause is claimed.
  The dependency journey now also cancels its rejected draft through the UI and
  checks that the saved document and write count remain unchanged. All prior
  rejection assertions remain. Additional LIVE evidence uses the existing default
  Docker Chrome runtime with the complete terminal suite and real protected
  services. It does not substitute for the changed-suite adapter's native
  browser command or its strict result validation. No isolation setting, case,
  timeout or required gate is removed. Incomplete native diagnostics are not
  reported as successful commands or a fixed browser defect. The same isolated
  spec subsequently completed in native Chrome's existing headed mode: three
  passed, zero failed, pending or skipped, exit 0, 48.22 seconds. This is a
  diagnostic receipt, not the full pre-push gate.
- The additional Docker LIVE run passed the A-to-B journey and all three real
  SQL verticals, including dependent `line_total` computation, persisted-plan
  digest checks, Preview and publication. It also exposed a failed model-reopen
  visibility assertion in the older Transform journey. Its two reopen calls
  accepted an already-recorded draft GET. They now reuse the existing
  `revisitWorkbenchCanvas` boundary to require a fresh read, preserving all
  visibility and persisted-output assertions without extending action timeouts.
  Its final result was 42 passed and two failed out of 44, with no pending or
  skipped cases. The second failure was terminal StartRun HTTP 503; its precise
  admission cause was not captured. The test now checks the real start response
  and reports its structural reason before checking navigation. No backend
  change, retry or relaxed expectation is inferred from that unexplained 503.
  A complete subsequent gate is required; passing individual cases does not make
  that Docker run a successful command.
- Planning DB implementation acceptance passed against base
  `926713bfd65ad004e04bbcde47c5ba12be195506` and head
  `588b2b431ebe040f9e660bddf397a889de3f2c45` with 482 native manifests. This is
  historical evidence, not acceptance of a later commit. Final exact-SHA DB
  acceptance, pre-push and required PR CI receipts belong on the governing issue
  and delivery PR; the historical counts above do not substitute for those gates.

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
