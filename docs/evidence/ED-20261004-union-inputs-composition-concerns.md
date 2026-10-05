---
title: Ordered UNION inputs and bounded composition concerns
status: draft
date: 2026-10-05
owners:
  - apps/web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalOperationInputs.ts
  - apps/web/src/app/views/canvas/canvasStagedOperation.ts
  - apps/web/src/app/views/canvas/canvasStagedCompositionConfiguration.ts
  - apps/web/src/app/views/canvas/canvasRetainedUnionComposition.ts
  - apps/web/src/app/views/canvas/canvasCanonicalGraphEditingCommand.ts
  - apps/web/src/app/views/canvas/CanvasRelationalOperationPorts.templates.tsx
  - apps/web/cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-relational-authoring-draft.contract.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasStagedCompositionConfiguration.test.ts src/app/views/canvas/canvasStagedCompositionContract.test.ts src/app/views/canvas/canvasStagedOperation.test.ts src/app/views/canvas/canvasCanonicalGraphDisconnect.test.ts src/app/views/canvas/canvasModelProducerComposition.test.ts
---

# Ordered UNION inputs and bounded composition concerns

## Governing sources and scope

Issue [#3271](https://github.com/dunay2/dvt/issues/3271) owns the product slice.
Planning DB designs `GH-3271-UNION-INPUTS` and
`GH-3271-COMPOSITION-CONCERNS` admit its implementation. The
[recomposition journal](https://github.com/dunay2/dvt/issues/3271#issuecomment-5996025231)
separates product changes from the fixture work retained in #3578. Existing
`ConfigureCanvasDvtNode`, `SaveWorkspaceGraphDraft` and
`ProjectCanvasRelationalTree` rails remain the owners. The
[draft contract](../contracts/planner/workspace-graph-draft-persistence-v1.md),
[rail catalogue](../architecture/components/web/graph/canvas-workbench-command-query-catalog.md)
and [ADR-0064](../adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md)
govern identity, persistence and semantic ownership.

## Implementation and rationale

UNION ALL and DISTINCT use one SetRel with at least two ordered operands and an
append port. The shared contract policy replaces duplicated cardinality lists;
JOIN and other fixed-arity operators retain their existing limits. The common
card derives ports and geometry from that policy. Passive markup and CSS stay
separate from gestures and semantic configuration; no duplicated React state or
effect-driven commands are introduced.

```text
Contract input policy -> connection admission -> canonical composition
                      -> port projection -> passive template and geometry
Saved semantic tree <-> existing editable graph -> Apply / protected save
```

Canonical connect and disconnect share a lossless graph projector and a
revision-bound command owner. Reconnecting the same wire is a no-op. Retained
UNION configuration preserves relation and output identities, selected outputs
and aliases while rebinding operand provenance. Removing an input above the
minimum compacts only the input list; the disconnected source stays available.

The existing schema derivation and connection owners reject incompatible
operands before publishing semantics. Invalid retained identities raise
`SubstraitAnalysisError` with code `invalid_binding` and relation identity.
Diagnostic prose is not a message contract. Failure leaves the pending operation
and producers unchanged. No second schema validator or error hierarchy is added.

The binary-only configuration and inspector names are retired with their actual
consumers. Terminal Output admission is separate from operation input commands.
Fixture factories, transport routing and unrelated scenario extraction are not
part of this product diff.

## Validation record

- Contract TDD: two new N-input cases failed before implementation; all 33 cases
  passed afterward, including fixed-arity and unknown-operation rejection.
- Retained-configuration TDD: the identity case first failed because the old
  path threw a generic Error. After adopting the existing typed error, all 186
  focused composition, connection and producer cases passed across five files.
- Both affected presentation files passed all 17 cases. Web typecheck and the
  touched-file typed lint passed; no rule was suppressed.
- The Contracts package passed all 802 cases; both package typechecks and all
  46 browser-routing architecture cases passed. Reusing the existing source
  fixture removed duplicate connection metadata without changing its values;
  the affected configuration file passed all 33 cases again.
- The retained negative paths prove mismatched root identity and incompatible
  third-input type, with unchanged pending state and producer documents.
- The reviewed browser replacement covers both modes through 3 → 4 → 3 inputs,
  exact saved identities/provenance, zero PUT on Cancel, and ordered reload with
  the disconnected source retained. It reuses the controlled HTTP scenario;
  it is not provider-execution evidence. Both cases passed in native Chrome,
  with zero failures, pending cases or skips. The first run exposed a Cypress
  subject-changing assertion; the corrected callback retains both the pending
  state and ordinal assertions. Product behavior was not changed to fit the test.
- After rebasing onto integrated #3580, both browser cases passed again in 21s,
  now requiring exactly one PUT per Apply and the unchanged physical identity of
  both Source-to-Model edges. Metadata bindings are not confused with physical
  edge identity. The initial build correctly rejected stale compiled Contracts
  from the previously checked-out branch; the existing `test:deps` command
  prepared the runtime dependency closure before the successful browser run.
- The early implementation gate found nine undeclared private browser-proof
  symbols. Their file was already admitted in the design. The native registration
  added their implementation references to the existing command record, without
  a new rail or DB rebuild; the clean comparison then passed all 482 manifests.
  This receipt correction is recorded as postimplementation, not retroactive
  design admission. Final rebased-SHA acceptance remains mandatory.
- Final complete-diff validation, ARC evaluation, `verify:prepush`, exact-SHA DB
  validation and required PR checks are
  still required. Earlier branch results are not substituted for this candidate.

## Deployment and residual boundary

This is a development hard cut, not a migration or a v2 DTO. Deploy readers and
writers together: an older reader can reject a new N-input draft. Existing
two-input identities remain unchanged and stored data is not rewritten. A code
rollback must not silently truncate newer drafts. Coercion and additional target
profiles remain outside this admission.

No hooks or rules are bypassed or relaxed. No compatibility facade, stub, fake
success or new debt entry is introduced. The
[set-composition risk](../risk-register/quality/R-20260831-SUBSTRAIT-UNION-ALL-DRIFT.yaml)
and the broader #3271 accessibility/performance acceptance remain explicit; this
bounded slice does not close the programme by inference.
