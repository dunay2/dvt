---
title: Opaque DVT authoring identity evidence
status: Accepted
date: 2026-09-06
owners:
  - contracts
  - web
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitAuthoringIdentity.ts
  - packages/@dvt/contracts/src/substrait.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.ts
  - apps/web/src/app/views/canvas/canvasCalculatedColumnAuthoring.ts
  - apps/web/src/app/views/canvas/canvasTransformSourceReplacement.ts
  - apps/web/src/app/views/canvas/canvasDuplicateNodeCommand.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web test:canvas-unit:run
    - pnpm --filter @dvt/web test:presentation:run
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm verify:prepush
---

# Opaque DVT authoring identity evidence

Issue #2936 integrates the ten identity cuts through the existing
`ConfigureCanvasDvtNode` rail. ADR-0064 and the semantic-transformation component
own the contract: Substrait owns meaning and the DVT sidecar binds assigned,
stable identity to that meaning.

The shared allocator delegates to the existing UUIDv7 primitive. Production
creation paths allocate new relations and outputs; edit/reload paths preserve
existing opaque IDs, including persisted legacy strings. JOIN and SET consumers
resolve graph context and explicit provenance rather than parsing those strings.

The Source Inspector regression proves repeated reads remain clean without a
semantic document. The calculated-output regression fails when the result omits
its actual created FieldId. The Source-replacement regression fails when a new
output ID is derived from its name; both pass with the shared allocator and
actual created identity returned by the existing command.

The rename/lineage regression edits one persisted projection and verifies that
source/output edge identity survives the display-name change. It does not
simulate a rename by creating a different semantic object.

Structured duplication creates fresh relation and field identities while retaining
semantic plan bytes and physical provenance. Internal source and parent bindings
remain closed over the new sidecar, and malformed authority is rejected before
node admission through the existing graph authoring command.

Final command outcomes, live proof, review resolution and merge acceptance are
recorded and verified in [issue #2936](https://github.com/dunay2/dvt/issues/2936).
The CI bootstrap snapshot is exported from Planning DB; validation uses an
isolated database and does not rebuild the working architecture authority.
