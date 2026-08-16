---
title: VTX1 column lineage mapping projection
status: Accepted
date: 2026-08-16
owners:
  - '@dvt/web'
arc_level: ARC-1
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasColumnMappingAuthoring.ts
  - apps/web/src/app/views/canvas/canvasColumnLineageProjection.ts
  - apps/web/src/app/views/canvas/CanvasColumnLineageEdge.tsx
  - apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx
evidence:
  tests:
    - pnpm --filter @dvt/web test:canvas:run -- src/app/views/canvas/canvasColumnMappingAuthoring.test.ts src/app/views/canvas/canvasColumnLineageProjection.test.ts src/app/views/canvas/useCanvasControllerReadModel.test.tsx
    - pnpm --filter @dvt/web test:presentation:run -- src/app/plugins/graph/GraphNodeColumnSection.test.tsx
    - pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasColumnLineageEdge.test.tsx
    - pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasAuthoringProjection.architecture.test.ts
    - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:feature-mechanization:implementation -- --feature VTX1-COLUMN-LINEAGE-MAPPING-PROJECTION
    - pnpm verify:prepush
---

Issue #2384 projects column lineage from the `VisualTransformRecipeV1`
authority introduced by #2383. Source, transform, and sink cards expose
role-correct stable column ports. Pointer and keyboard gestures update the
existing Graph Draft node through the DVT transform-authoring command seam.

The custom React Flow edges are derived on read from recipe inputs, declared
stage dependencies, and transient column disclosure. Neither column edges nor
disclosure state are persisted as a second semantic mapping store. Multi-input
and renamed recipe outputs project without inventing another format.

Automap accepts only a unique exact-name match with known compatible types.
Unknown, ambiguous, disconnected, complex-expression, and SQL-authoritative
cases fail closed. The bounded Cypress flow proves create, remap, collapse,
restore, select, remove, English and Spanish copy, constrained viewport, and
serious/critical accessibility checks.

No API, contract, adapter, renderer, router, dependency, migration, stub, fake
success path, or compatibility store was added.
