---
title: VTX1 visual transform recipe authority
status: Accepted
date: 2026-08-16
owners:
  - '@dvt/contracts'
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/VisualTransformRecipe.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test:canvas:run -- src/app/views/canvas/canvasDvtTransformAuthoringAuthority.test.ts src/app/services/workspace/workspaceGraphDraftProjection.test.ts src/app/views/canvas/canvasDraftAuthoring.test.ts
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature VTX1-VISUAL-TRANSFORM-RECIPE-AUTHORITY
    - pnpm verify:prepush
---

Issue #2383 introduces one strict `VisualTransformRecipeV1` value object and an
exclusive DVT transform-authority policy. A transform is SQL-authoritative or
visual-recipe-authoritative; it cannot be both. Unknown operations, malformed
references, duplicate output or filter identities, and blank SQL conversion
reject before draft mutation.

The existing `WorkspaceGraphAuthoringDraft` remains the only persistence
aggregate. Contract and Web tests exercise a real CanonicalNode to Graph Draft
to CanonicalNode roundtrip and deterministic recipe serialization. Existing
nodes without an authority envelope remain SQL-authoritative without migration,
while invalid envelopes fail closed.

No UI, React Flow edge collection, SQL parser or generator, API, runtime,
adapter, new store, compatibility store, stub, or fake success path is added.
Column-lineage edges remain a derived read model for issue #2384.
