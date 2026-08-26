---
title: VTX2 typed Substrait card pilot evidence
status: Review
date: 2026-08-26
owners:
  - web
  - contracts
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPilot.ts
  - apps/web/src/app/views/canvas/DvtSubstraitPilotAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.ts
  - apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts
  - apps/web/src/app/views/canvas/canvasTransformationSqlMirror.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPilot.test.ts
  - packages/@dvt/contracts/src/contracts/planner/VisualTransformRecipe.v1.ts
  - packages/@dvt/contracts/test/visual-transform-recipe.contract.test.ts
evidence:
  tests:
    - Affected workspace preflight on PR #2658
    - Contracts package tests on PR #2658
    - Web Frontend Tests on PR #2658
    - Dependency Review on PR #2658
---

# VTX2 typed Substrait card pilot evidence

## Scope

Issue #2598 proves one deliberately bounded authoring fixture:

```text
customers(name, email, country)
name -> trim -> upper -> customer_name
```

The existing DVT transform card edits a generated Substrait `Plan` directly in
memory. The existing DVT sidecar preserves stable `RelationId` and `FieldId`
identity. Protobuf bytes and SHA remain the persisted semantic-document format.

## Reuse and exclusions

The slice reuses the existing `transformAuthoring` metadata authority, Inspector
Apply/Cancel lifecycle, Workspace Graph Draft persistence, card presentation
projection, Substrait capability catalog, and SQL resolution boundary.

It does not add a DVT relational IR, recipe service, builder framework,
repository, mutation engine, visitor, command bus, new store, new monorepo
package, SQLGlot, SQL generation, joins, aggregates, or windows.

## Behavioral evidence

The focused Web test proves that:

- the generated typed `Plan` becomes `ReadRel -> ProjectRel` with exact
  `trim:str` and `upper:str` scalar-function declarations;
- rename to `customer_name` preserves the same DVT `FieldId`;
- Apply re-encodes the Plan, recomputes SHA, and rebinds the sidecar SHA;
- not applying the transient Inspector draft leaves semantic authority unchanged;
- Graph Draft reload reconstructs the same semantic recipe and stable identity;
- the existing card projects `customer_name`, `email`, and `country` from the
  Plan plus sidecar;
- unsupported Plan shapes fail closed; and
- Substrait authoring cannot fall back to VTX1 column mapping or editable SQL.

## Architecture assessment

The slice remains inside ADR-0064. Substrait owns relational/function semantics;
the DVT sidecar owns only stable authoring identity/provenance. Logical
`ProjectRel` and scalar functions do not create Canvas or runtime steps.

The pilot consumes the exact generated Substrait v0.101.0 SDK already proven by
the bounded TypeScript spike. No second semantic registry or hand-written
protobuf model is introduced.

## Quality gates

At the time this evidence was created:

- affected workspace build, lint, and type-check preflight: passed;
- contracts package tests: passed;
- dependency review: passed;
- full Web primary Vitest suites: running after PR #2658 left draft state;
- one unrelated repository CI-tool executable-contract test remains red because
  its pre-existing expectation does not include the already-present
  `@dvt/contracts/substrait` export on `main`.

The PO and final architecture verdict remain pending until the full Web suite
finishes without a #2658 regression.
