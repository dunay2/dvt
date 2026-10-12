---
title: Compact selected-operation data preview
status: Accepted
date: 2026-09-19
owners:
  - dvt-web
  - dvt-api
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/CanvasOperationDataPreview.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalTreeEditorFrame.tsx
  - apps/web/src/app/views/canvas/CanvasModelDataView.tsx
  - apps/api/src/application/services/previewCanvasTransformRowsUseCase.ts
  - packages/@dvt/postgres-projection/src/substraitRelationSelection.ts
  - packages/@dvt/contracts/src/contracts/canvas/TransformDataSample.v1.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/contracts' schema:verify
    - pnpm --filter '@dvt/postgres-projection' test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter '@dvt/web' test:presentation:run
    - pnpm --filter '@dvt/web' test:architecture:run
    - pnpm --filter '@dvt/web' test:e2e:native --spec cypress/e2e/canvas/canvas-relational-tree-operators.cy.ts
    - pnpm verify:prepush
---

# Compact selected-operation data preview

## Authority and rationale

[Issue #3296](https://github.com/dunay2/dvt/issues/3296), the
[implementation plan](https://github.com/dunay2/dvt/issues/3296#issuecomment-5737213420),
ADR-0064, and the existing `PreviewCanvasTransformRows` query
([#3237](https://github.com/dunay2/dvt/issues/3237)) govern this slice.
Planning DB mechanization identity is `GH-3296-SELECTED-RELATION-PREVIEW`.
The executable ARC evaluator classifies the complete branch as ARC-2 because
the bounded row-sample contract changes.

```text
Main relational tree (above)
  selected operation
    expression | condition/operator editor | bounded rows
    RelationId + full semantic SHA
      -> existing protected query -> selected canonical subtree
      -> existing PostgreSQL projection -> read-only sample
```

The lower editor uses three compact columns on wide viewports and stacks the
sample below on narrow viewports. Each panel owns its scrolling. Selecting a
different operation or changing its semantic revision clears the previous
sample and invalidates in-flight responses. Incomplete/unapplied edits cannot
be previewed. Preview is explicit, not a query on each keystroke.

The optional request `relationId` requires `semanticPlanSha256`; the response
echoes the identity and full protected-document digest. Legacy full-Model
requests retain their previous shape. Deploy the API contract before the Web
client; an old API response without the requested identity is rejected, never
shown as intermediate rows.

The server resolves the existing protected Canvas closure before selecting the
subtree. It clones the canonical Substrait plan, retains stable relation/field
identities, rebases transient anchors, and invokes the existing shared projector.
It never saves the transient plan or accepts SQL from the browser. Tenant,
project, environment, connection, row limits and read-only timeout are unchanged.

## Evidence and limits

- Package tests distinguish first JOIN (two inputs, four outputs) from the
  final JOIN (three inputs), verify document immutability, and reject foreign
  relation identity, stale hashes and duplicate anchors.
- Contract, route and use-case tests cover selected identity/version propagation
  and rejection before database probing. Web tests cover wrong identity,
  late response, changed selection and unapplied edits.
- A live browser check against local Web/API/PostgreSQL returned six rows for
  the selected first JOIN, with `client_id` and `order_id`, then cleared those
  rows when the other JOIN was selected. No condition, composition or source
  data was changed. Browser screenshots are recorded in the issue closeout.
- Browser fixture tests check panel placement and interaction; their fixture
  rows are UI evidence, not evidence of PostgreSQL execution.
- The new browser regression waits for the specific saved operation identity
  before reopening the fixture. Waiting for any draft PUT can observe an
  earlier layout save and does not prove the operation was persisted.
- The API unit suite passed 1166 tests with 27 pre-existing conditional skips.
  Those skips are not asserted as executed integration coverage.
- This does not expand server semantic admission. The existing supported
  INNER JOIN and direct connected-field PROJECT profiles remain authoritative.
  Unsupported selected aggregates, windows, filters, set operations and JOIN
  variants return unavailable, never final-Model or fabricated rows.

Final gate outcomes and any failed attempts are recorded on the governing issue.
The broader operator-support epic and draft PR #3301 are not closed by this slice.

## No-debt and no-stub posture

No new query rail, execution authority, fake product row source, placeholder,
TODO, hook bypass or relaxed quality rule was introduced. Existing risk
`R-20260915-TRANSFORM-ROW-PREVIEW` includes selected-identity mitigation; it is
not a newly accepted debt item.
