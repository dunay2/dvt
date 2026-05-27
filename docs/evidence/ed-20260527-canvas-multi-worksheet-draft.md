---
title: Canvas multi-worksheet draft contract
status: Accepted
date: 2026-05-27
owners:
  - '@dvt/contracts'
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/canvasProjectCanvasLifecycle.ts
  - apps/web/src/app/views/canvas/canvasProjectCanvasLifecycleCommand.ts
  - apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx
  - apps/web/src/app/views/canvas/useCanvasExecutionActions.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts
    - pnpm --filter @dvt/web test:canvas-unit:run -- canvasWorkspaceExplorerModel.test.ts canvasCreateCanvasDocumentCommand.test.ts canvasPlaygroundTabStripModel.test.ts canvasCreateCanvasDocumentAvailability.test.ts
    - pnpm --filter @dvt/web test:presentation:run -- CanvasInspectorPanel.test.tsx CanvasPlaygroundTabStrip.test.tsx CanvasShell.test.tsx
    - pnpm --filter @dvt/web test:presentation:run -- CanvasInspectorPanel.test.tsx useCanvasExecutionActions.planPreview.core.test.tsx useCanvasExecutionActions.runStart.test.tsx
    - pnpm --filter @dvt/web test:unit:run -- canvasProjectCanvasLifecycle.test.ts
---

# Canvas Multi-Worksheet Draft Contract

## Scope

This evidence covers the compatible extension of
`WorkspaceGraphAuthoringDraft.v1` so one protected project draft can contain
multiple canvas worksheets while keeping the existing top-level active graph
projection for current planner and runtime consumers.

## Compatibility

Existing single-canvas drafts remain valid because `activeCanvasId` and
`canvases` are optional. When the multi-canvas fields are present, contract
validation requires unique canvas ids, a declared active canvas, and an active
workspace that mirrors the top-level graph.

## Proof

The covered tests prove:

- old empty and one-node draft payloads remain valid;
- multi-canvas payloads with one active canvas are valid;
- duplicate canvas ids and missing active canvas ids reject;
- `New canvas` appends a workspace instead of replacing the current one;
- Explorer lists all canvases and marks the active row;
- Inspector shows canvas properties, allows rename, and disables delete when
  deletion is not allowed;
- Inspector lets the user select the active canvas execution environment;
- Plan preview and Run start use the selected canvas environment when present;
- lifecycle model transitions select, rename, and delete through draft payloads.
