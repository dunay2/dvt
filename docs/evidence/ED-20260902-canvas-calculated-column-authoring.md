---
title: Canvas calculated-column Substrait authoring evidence
status: Accepted
date: 2026-09-02
owners:
  - web
  - contracts
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
  - apps/web/src/app/views/canvas/canvasCalculatedColumnAuthoring.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitCalculatedColumn.ts
  - apps/web/src/app/plugins/graph/GraphNodeCalculatedColumnForm.tsx
  - apps/web/cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts
    - pnpm docs:feature-mechanization:implementation -- --feature CANVAS-CALCULATED-COLUMN-AUTHORING-2833
    - pnpm verify:prepush
---

# Canvas calculated-column Substrait authoring evidence

## Scope

Issue #2833 adds one keyboard-accessible action in the stable gap after a
Source or projection Transform field list. The bounded form can append a text
literal, timestamp-with-time-zone literal, admitted unary text function, or
ordered `row_number` output with a required alias.

## Semantic boundary

The existing `ConfigureCanvasDvtNode` command is the only mutation rail. A
physical PostgreSQL Source is promoted in place to a DVT Transform with the
same node identity, position, title, metadata and physical source binding. Its
canonical meaning is a self-contained Substrait `ReadRel -> ProjectRel`; the
catalog schema is not mutated and no hidden node is created. An existing
projection Transform appends to its same Plan and sidecar.

The slice admits pinned Substrait v0.101.0 `rex_type.literal` and
`kind.precision_timestamp_tz`. String type, scalar functions and ordered
`row_number` reuse previously admitted identities. PostgreSQL is derived from
that Plan. Blank or duplicate aliases, invalid timestamps, absent fields,
unsupported capabilities, providers or Plan shapes fail without changing the
draft.

## Product evidence

Focused behavior tests prove Source promotion, Transform append, duplicate
rejection, continued authoring after promotion, exact Plan inspection and
PostgreSQL derivation. The Canvas E2E focuses and activates the gap action,
creates a literal field, verifies the saved typed Plan, reloads the draft and
finds the same calculated field on the same card.

No free-form SQL, private expression IR, fake catalog field, compatibility
layer, alternate save route or provider runtime was added.
