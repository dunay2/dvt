---
title: Transform function alias authoring evidence
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
  - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.ts
  - apps/web/src/app/plugins/graph/GraphNodeColumnFunctionAliasForm.tsx
  - apps/web/src/app/plugins/graph/GraphNodeColumnPiece.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDvtSubstraitPostgresProjection.test.ts src/app/views/canvas/canvasColumnMappingAuthoring.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Transform function alias authoring evidence

## Scope

Issues #2825, #2826, and #2827 close one bounded Transform-field authoring increment:

```text
compatible field function
  -> explicit output alias
  -> canonical Substrait scalar expression and Root name
  -> source -> alias card projection
  -> ordered expression lineage on inspection
```

Pointer-opened transient menus share a one-second grace period. Entering the
surface cancels dismissal, leaving starts a fresh grace period, and
keyboard-opened menus do not expire.

## Architecture boundary

The implementation reuses `ConfigureCanvasDvtNode` for semantic mutation and
`RenderCanvasContextualGraphSurface` for contextual presentation. The alias is
the actual Substrait `RelRoot` output name and matching DVT field-sidecar display
name; it is not a second visual label. Stable `FieldId` remains unchanged.

The card read model derives `source -> alias` and the ordered function chain
from the inspected canonical expression. No SQL authority, private expression
model, compatibility path, importer, or second command was introduced.

`LOWER` is admitted through the pinned Substrait v0.101.0 string-extension
identity and the existing PostgreSQL projection path. Multi-argument functions
remain outside this cut until their operand-authoring contract is governed.

## Negative evidence

Blank or duplicate aliases leave the draft unchanged. Unsupported types,
providers, functions, unknown fields, self-composition, and malformed plans
continue to fail closed. Selecting or cancelling the alias form does not mutate
the graph; only a valid form submission reaches the canonical command.
