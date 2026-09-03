---
title: VTX1 authoring authority hard cut
status: Accepted
date: 2026-09-03
owners:
  - packages/@dvt/contracts
  - web
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtTransformAuthoringAuthority.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.ts
  - apps/web/src/app/views/canvas/canvasDvtTransformAuthoring.ts
  - apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web test:canvas:run
    - pnpm verify:prepush
---

# VTX1 authoring authority hard cut

## Scope

Issue #2600 step 2 removes the former VTX1 recipe, editable DVT SQL, SQL mirror, and
visual-to-SQL compiler from the supported Web authoring path and public planner contracts.
An empty Transform remains explicitly uninitialized; its first accepted authoring action creates
one canonical Substrait semantic document.

## Semantic boundary

`ConfigureCanvasDvtNode` remains the sole command rail. Column mapping, ordering, output
selection, functions, aliases, descriptions, and multi-input composition mutate that authority.
React Flow handles and field edges remain derived presentation.

Existing workspace SQL files remain readable preview artifacts. Removed SQL/VTX1 node metadata
fails closed and is not migrated implicitly. The focused modules separate source connection,
Transform codec, sink policy, projection persistence, mapping, automap, and output ordering; no
compatibility facade or second store remains.

## Product evidence

Contract tests prove the strict canonical-only envelope. Canvas behavior tests prove creation,
mapping, remapping, removal, ordering, output inclusion, function preservation, composition,
preview, and fail-closed legacy rejection. The absence guard proves retired production modules
and public symbols are not reintroduced.

No rule was disabled, no hook was bypassed, and no stub or deferred compatibility branch was
added.
