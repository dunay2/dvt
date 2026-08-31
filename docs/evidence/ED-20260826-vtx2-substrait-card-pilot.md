---
title: VTX2 typed Substrait card pilot evidence
status: Accepted
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
  - apps/web/src/app/views/canvas/DvtSubstraitPilotEntry.test.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPilot.review.test.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPilot.test.ts
  - apps/web/src/app/views/canvas/canvasSubstraitPresentationFailClosed.test.ts
  - apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.ts
  - apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts
  - apps/web/src/app/views/canvas/canvasTransformationSqlMirror.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
  - apps/web/src/app/views/canvas/DvtSubstraitInnerJoinAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitPostgresProjection.ts
  - apps/web/src/app/views/canvas/canvasPreviewProvenance.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/VisualTransformRecipe.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
  - packages/@dvt/contracts/test/visual-transform-recipe.contract.test.ts
evidence:
  tests:
    - PR Quality Checks on PR #2658
    - Affected workspace build, lint and type-check preflight on PR #2658
    - Contracts Required for Merge on PR #2658
    - Package Tests (contracts) on PR #2658
    - Dependency Review on PR #2658
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts lint
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature VTX2-SUBSTRAIT-INNER-JOIN-20260831
    - pnpm verify:prepush
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

The slice reuses the existing `ConfigureCanvasDvtNode` / `transformAuthoring`
authoring rail, Inspector Apply/Cancel lifecycle, Workspace Graph Draft
persistence, card presentation projection, Substrait capability catalog, and SQL
resolution boundary.

It does not add a DVT relational IR, recipe service, builder framework,
repository, mutation engine, visitor, command bus, new store, new monorepo
package, SQLGlot, SQL generation, joins, aggregates, or windows.

## Behavioral evidence

The focused Web evidence proves that:

- a normal empty DVT transform connected to the exact admitted `customers`
  fixture can enter Substrait authoring through the existing Inspector rail;
- the generated typed `Plan` is `ReadRel -> ProjectRel` and the editable chain
  uses exact `trim:str` and `upper:str` simple-extension declarations;
- the function anchors are accepted only when they resolve to the exact
  `extension:io.substrait:functions_string` URN;
- only catalog entries promoted to `supported-profile` can be authored;
- rename to `customer_name` preserves the same DVT `FieldId`;
- Apply re-encodes the Plan, recomputes SHA, and rebinds the sidecar SHA;
- not applying the transient Inspector draft leaves semantic authority unchanged;
- Graph Draft reload reconstructs the same semantic recipe and stable identity;
- non-string input, hidden `ReadRel` semantics and unsupported Plan shapes fail
  closed;
- an unsupported persisted Substrait Plan does not masquerade as an inherited
  pass-through card; and
- Substrait authoring cannot fall back to VTX1 column mapping or editable SQL.

## Product Owner verdict

**Accepted for the pilot.**

The cut proves the intended product question without introducing a second
semantic authority or infrastructure layer. The relatively verbose pilot module
is explicit protobuf construction/inspection for one exact shape, not a generic
builder framework. Replacing that code with opaque fixture bytes or extracting a
new service/repository solely to reduce file length would weaken the pilot.

No additional product abstraction is justified until a second real semantic
case creates demonstrated duplication.

## Architecture assessment

**Adequate for this pilot.**

The slice remains inside ADR-0064:

- generated Substrait v0.101.0 `Plan` types own relational/function semantics in
  authoring memory;
- protobuf bytes plus SHA remain persistence/transport representation;
- the DVT sidecar owns stable authoring identity/provenance only;
- logical `ProjectRel` and scalar functions do not create Canvas or runtime
  steps;
- the existing `ConfigureCanvasDvtNode` and Workspace Graph Draft rails are
  reused rather than duplicated;
- capability admission is explicit and fail-closed;
- no private DVT relational IR, second semantic registry, new store, service or
  builder layer is introduced; and
- repository architecture dependency checks pass.

The ephemeral Planning DB used by repository checks validates Git-governed
projections and governance surfaces only. It does not replace, export, or claim
to validate the persistent DB-first architecture authority discussed separately.

This verdict is intentionally narrow: it approves the #2598 pilot boundary, not
future SQL rendering, persistence policy, multi-relation authoring, or the final
shape of later abstractions.

## Extension evidence: first typed INNER JOIN card

Issue #2634 extends the same card authority with one deliberately bounded
multi-input shape. Two existing PostgreSQL source nodes on the same connection
feed one existing `dvt:sql_transform` card whose semantic document is a pinned
Substrait `ReadRel + ReadRel + INNER JoinRel(equal)` plan. The DVT sidecar keeps
the two physical source identities and stable output field identities.

The existing `ConfigureCanvasDvtNode`, Workspace Graph Draft, and
`PreviewExecutionPlan` rails are reused. Node Properties offers the action only
for the exact admitted source schemas, the card projects the plan's three
declared outputs, and Preview requires both scoped graph sources to match the
sidecar before projecting PostgreSQL SQL. Mixed connections, mismatched source
identity, unsupported join kinds, unsupported functions, and unsupported plan
shapes fail closed.

Substrait remains the only semantic authority. This extension introduces no
Canvas `JoinNode`, private relational IR, SQL editor, dbt model authority, new
store, or parallel persistence rail. SQL is a generated provider projection;
future dbt support may consume a generated compatibility projection only.

Planning DB feature mechanization was written directly as two scoped rows for
`ConfigureCanvasDvtNode` and `PreviewExecutionPlan`; no inventory import or
database rebuild was performed. The next product cuts—field selection,
grouping, and windows—remain separate capability admissions.

## Quality gates

Acceptance evidence on PR #2658:

- changed-file format/lint: passed;
- focused committed-diff tests: passed;
- ARC policy and ARC docs/evidence validation: passed;
- Planning DB preparation required by the PR gate: passed;
- governance unit coverage and governed changed-files validation: passed;
- architecture dependency boundaries (`arch:deps`): passed;
- affected workspace build, lint and type-check preflight: passed;
- CI tool static and executable contracts: passed;
- contracts/determinism required-for-merge gate: passed;
- golden paths, deterministic pattern scan and JSON schema validation: passed;
- package tests for `@dvt/contracts`: passed;
- dependency review: passed.

A root-build-sensitive full Web primary-suite run (`33071269569`) remained stale
in GitHub without updates after exceeding the workflow's own 25-minute job
limit. It is not used as acceptance evidence and no product failure was reported
by that run. Product acceptance relies on the focused changed-file tests plus
successful Web dependency build and affected workspace build/lint/type-check
gates.

## Residual scope

The pilot deliberately does not prove SQL rendering/provider execution. That is
owned by the later `Substrait -> SQLGlot AST -> SQL` cut. It also does not prove
joins, aggregates, windows or a general visual grammar. Unsupported semantics
remain fail-closed until separately admitted.
