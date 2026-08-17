---
title: Bounded warehouse source data sample in the Canvas bottom drawer
status: Accepted
date: 2026-08-17
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceDataSample.v1.ts
  - apps/api/src/application/ports/warehouseSourceImport.ts
  - apps/api/src/application/services/previewWarehouseSourceObjectRowsUseCase.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts
  - apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - apps/web/src/app/views/canvas/canvasSourceDataSample.ts
  - apps/web/src/app/views/canvas/CanvasViewport.tsx
  - apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx
evidence:
  tests:
    - pnpm exec vitest run packages/@dvt/contracts/test/source-import/SourceDataSample.v1.test.ts
    - pnpm exec vitest run --config apps/api/vitest.config.ts apps/api/test/application/services/previewWarehouseSourceObjectRowsUseCase.test.ts apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts
    - pnpm exec vitest run --config apps/api/vitest.config.ts apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    - pnpm exec vitest run --config apps/web/vitest.config.ts apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx
    - pnpm verify:prepush
---

GitHub issue #2417 defines the vertical, command/query rails, Definition of Ready,
Definition of Done, and Fowler test matrix for this change.

The implementation adds a bounded query for rows from an already governed relational
source. The API owns authorization, identifier validation, a read-only transaction,
a local statement timeout, and the hard maximum of 50 rows. The browser requests 20
rows and renders string-or-null values in the existing accessible Canvas bottom drawer.
No SQL text or warehouse credential is accepted from the client.

Headed browser verification used the real `dvt.public.pth2_orders` source. A single
click on the gray operational rail retained the health popover; double click and the
keyboard equivalent, Enter, opened the bottom drawer with the three real rows. The
drawer-scoped axe audit reported zero WCAG 2 A/AA violations and zero incomplete checks.

No compatibility branch, alternate serializer, stub, or fake success path was added.
