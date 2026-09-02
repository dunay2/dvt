---
title: Transform column comment authoring evidence
status: Accepted
date: 2026-09-02
owners:
  - web
  - contracts
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProfile.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitFieldDocumentation.ts
  - apps/web/src/app/views/canvas/useCanvasColumnCommentCellRenderer.tsx
  - apps/web/src/app/plugins/graph/GraphNodeColumnPiece.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- dvt-substrait-profile.contract.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/web test:canvas-unit:run -- canvasDvtSubstraitProjection.alias.test.ts
    - pnpm --filter @dvt/web test:canvas-presentation:run -- CanvasColumnCommentEditor.test.tsx NodePropertySectionView.test.tsx NodePropertiesTabs.sectionContent.test.tsx
    - pnpm --filter @dvt/web test:presentation:run -- GraphNodeColumnCommentTooltip.test.tsx
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Transform column comment authoring evidence

## Scope

Issue #2830 adds one bounded field-documentation increment:

```text
Columns inspector comment
  -> ConfigureCanvasDvtNode
  -> DVT Substrait field sidecar description
  -> canonical presentation projection
  -> card column tooltip
```

The editor commits on blur without Apply or Cancel controls. Blank input removes
the description. Applying a field function or alias retains the documentation
because the stable field identity remains unchanged.

## Architecture boundary

The description belongs to the existing DVT Substrait field binding. It is not
mirrored into generic node metadata, SQL, a private UI model, or a compatibility
store. Inspector and card surfaces project the same canonical sidecar value.

Only projection-shaped Substrait Transforms expose the editor. The existing
`ConfigureCanvasDvtNode` command remains the sole mutation authority.

## Negative evidence

Unknown fields, invalid projections, non-Substrait nodes, and non-projection
shapes fail closed. Read-only workspaces render the editor disabled. No new
command, parser, import path, placeholder, or synthetic persistence path was
introduced.
