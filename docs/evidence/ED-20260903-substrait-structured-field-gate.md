---
title: Substrait structured field capability gate evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitFieldBindingHierarchy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-struct-capability.contract.test.ts
  - apps/web/src/app/views/canvas/canvasStructuredFieldAuthoring.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitStructuredFieldReorder.ts
  - apps/web/src/app/plugins/graph/GraphNodeColumnChildren.tsx
  - apps/web/cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm exec eslint packages/@dvt/contracts/src packages/@dvt/contracts/test --max-warnings 0
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Substrait structured field capability gate evidence

## Scope

This vertical slice for issue #2771 admits the pinned core identities for
`substrait.Type kind.struct` and `substrait.Expression rex_type.nested`. It also
uses the existing authoring sidecar to retain a stable parent field identity
for ordered children and exposes that canonical mutation through the existing
`ConfigureCanvasDvtNode` command rail. It does not claim PostgreSQL projection
support.

## Behavioral proof

The protobuf contract test round-trips a heterogeneous struct and preserves
child order and nullability without a private encoding. Admission tests require
the construction expression and structured type together and keep target and
visual postures unavailable.

Sidecar tests prove that sibling ordinals are scoped to their parent and reject
unknown parents, cross-relation parents, duplicate identities and ancestry
cycles. Existing root fields remain valid because `parentFieldId` is optional.

Canvas behavior tests prove explicit Apply/Cancel composition, extension of an
existing struct and ordered child mutation. The browser flow proves canonical
autosave, visible child reordering and reload from the encoded Substrait
document rather than from optimistic component state.

## Boundaries

The capability catalog remains the only support authority. The semantic
document remains the only persistence authority. No parallel command, route,
UI-only tree, SQL convention, adapter or runtime operator was added. Unsupported
PostgreSQL projection continues to fail closed.
