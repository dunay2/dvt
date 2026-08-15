---
title: E DVT Inspector Panels Plan
status: Accepted
owner: Frontend / Architecture
last_reviewed: 2026-06-01
planning_type: proposal
lane: E
task_id: E-DVT-INSPECTOR-PANELS-1
---

# E DVT Inspector Panels Plan

## Summary

`E-DVT-INSPECTOR-PANELS-1` adds route-owned Inspector authoring controls for
DVT transformation nodes:

- `dvt:source` can configure `metadata.config.schema`, `table`, and `alias`.
- `dvt:sql_transform` can edit SQL text through the existing route-owned
  authoring draft.
- `dvt:sink` can configure `metadata.config.schema`, `table`,
  `materialization`, and `writeMode`.

This keeps the generic `InspectorPanel.tsx` passive. The writable behavior lives
in the Canvas Inspector authoring DTO and command seam already governed by the
Canvas Inspector Authoring component.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/graph/canvas-inspector-authoring-component.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/contracts/planner/transformation-flow-preview-v1.md`

## Command And Query Rails

- `ConfigureCanvasDvtNode` owns the route-owned command that applies DVT
  metadata edits to the Canvas draft node override.
- `GenerateTransformationWorkspaceArtifacts` remains the existing downstream
  command that reads source, transform, and sink metadata for preview artifact
  generation.

No new transport API route is introduced.

## Fowler Rationale

The root smell is boundary drift: DVT preview metadata could be absent until
preview assembly failed, and the only visible Inspector surface was generic node
details plus passive plugin panels. The fix is a DTO plus command-seam slice:
`DvtNodeAuthoringMetadata` is the value object, and the existing
`CanvasInspectorNodeDraft` remains the route-owned editing contract.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-DVT-INSPECTOR-PANELS-1
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-dvt-inspector-panels-plan-20260601.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-inspector-authoring-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - E-DVT-INSPECTOR-PANELS-1
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/graph/canvas-inspector-authoring-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/contracts/planner/transformation-flow-preview-v1.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx
  - apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx
  - apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
  - docs/architecture/components/web/graph/canvas-inspector-authoring-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/planning/proposals/mandatory/frontend-and-ux/e-dvt-inspector-panels-plan-20260601.md
  - docs/planning/proposals/index.md
  - docs/planning/index.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/web/src/app/components/InspectorPanel.tsx
  - apps/api/**
  - packages/**
domainObjects:
  - DvtNodeAuthoringMetadata
  - CanvasInspectorNodeDraft
  - TransformationWorkspaceArtifactProjection
fowlerSignals:
  - Boundary drift
  - Primitive obsession
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts src/app/views/canvas/canvasInspectorAuthoringModel.test.ts src/app/views/canvas/CanvasInspectorPanel.test.tsx src/app/views/canvas/useCanvasExecutionActions.planPreview.provenance.test.tsx src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx
cypressFlows:
  - N/A - route-owned unit and preview provenance coverage; no browser-only flow added.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts src/app/views/canvas/canvasInspectorAuthoringModel.test.ts src/app/views/canvas/CanvasInspectorPanel.test.tsx src/app/views/canvas/useCanvasExecutionActions.planPreview.provenance.test.tsx src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:sync
  - pnpm docs:gov:manifest:check
  - pnpm verify:prepush
commandQueryRails:
  - name: ConfigureCanvasDvtNode
    type: command
    dddOwner: DvtNodeAuthoringMetadata
  - name: GenerateTransformationWorkspaceArtifacts
    type: command
    dddOwner: TransformationWorkspaceArtifactProjection
redGreenCycles:
  - id: dvt-authoring-model
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
    expectedFailure: DVT node drafts did not project or apply source/sink metadata.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts
      - apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts
      - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
      - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
  - id: dvt-inspector-fields
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasInspectorPanel.test.tsx
    expectedFailure: DVT source, SQL transform, and sink controls were absent from the route-owned Inspector.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx
      - apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasInspectorPanel.test.tsx
symbols:
  - { name: DvtAuthoringFields, path: apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx] }
  - { name: DvtAuthoringFieldsProps, path: apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx] }
  - { name: buildDvtNode, path: apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx] }
  - { name: DEFAULT_MATERIALIZATION, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DEFAULT_SCHEMA_NAME, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DEFAULT_WRITE_MODE, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DvtNodeAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DvtNodeAuthoringMetadataErrors, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DvtSinkAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DvtSourceAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: DvtSqlTransformAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: VALID_MATERIALIZATIONS, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: VALID_WRITE_MODES, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: applyDvtNodeAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode, GenerateTransformationWorkspaceArtifacts], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: createDvtNodeAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: createSinkMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: createSourceMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: createSqlTransformMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: isRecord, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: normalizeEnumValue, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: normalizeIdentifier, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: readExistingConfig, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: readNodeMetadataRecord, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: readString, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: validateDvtNodeAuthoringMetadata, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: withConfig, path: apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Primitive obsession], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
  - { name: buildDvtNode, path: apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts, dddOwner: DvtNodeAuthoringMetadata, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-DVT-INSPECTOR-PANELS-1, cypressCoverage: N/A - unit coverage, unitTests: [apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts] }
```
