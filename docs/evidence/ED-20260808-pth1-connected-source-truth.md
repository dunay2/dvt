---
title: PTH1 connected-source product truth and workspace isolation
status: Accepted
date: 2026-08-08
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/ConnectedSourceRef.v1.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/application/services/warehouseSourceYamlIdentity.ts
  - apps/web/src/app/components/inspector/nodePropertiesReadModel.ts
  - apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx
  - apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx
  - apps/web/src/app/queries/workspaceQueries.scope.test.tsx
  - apps/web/src/app/views/canvas/CanvasShell.tsx
  - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
  - apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts
  - apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts
  - scripts/run-canvas-source-import-live-proof.cjs
  - scripts/run-canvas-source-import-live-proof.test.cjs
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test -- graphDraftWarehouseSourceImportStrategy.test.ts warehouseSourceYaml.test.ts
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts --maxWorkers=2 --minWorkers=2
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - node --test scripts/run-canvas-source-import-live-proof.test.cjs
    - pnpm --filter @dvt/web test:e2e:source-import:live
    - pnpm docs:feature-mechanization -- --feature PTH1-CONNECTED-SOURCE-TRUTH
    - pnpm docs:feature-mechanization:implementation -- --base origin/main --feature PTH1-CONNECTED-SOURCE-TRUTH
    - pnpm verify:prepush
---

# Summary

PTH1 hardens warehouse source import so the product preserves and shows the
connection-qualified identity that the user actually selected. The same
physical object reached through two connections remains two distinguishable
Canvas sources, while queries and caches remain partitioned by the complete
tenant, project and environment scope.

# Boundary and authority evidence

```mermaid
flowchart LR
  Scope[Server-granted workspace scope] --> Connections[List connections]
  Connections --> Objects[List connection objects]
  Objects --> Import[ImportWarehouseSources]
  Import --> Ref[ConnectedSourceRef v1]
  Ref --> Draft[Workspace graph draft]
  Draft --> Inspector[Visible connection fact]
  Draft --> Dbt[Single-edge dbt source projection]
```

- `ConnectedSourceRef.v1` is strict, versioned and secret-free. It owns
  `connectionId`, provider and physical `sourceObjectId`; projection-only
  `connectionName` remains outside the identity contract.
- The command admits the existing Canvas authority before external discovery;
  import then validates the complete draft before mutation and rejects legacy
  top-level source identity instead of translating or migrating it.
- Dedupe and generated source-YAML identity use JCS hashing over connection and
  physical object. No filename, display label or insertion order substitutes
  for product identity.
- Workspace file-tree and file-content caches include the full scope key. The
  query-level A/B/A proof uses the colliding path `models/orders.sql`. The
  live-product proof grants two real scopes in one authenticated session, uses
  the visible selector, authors the same `models/sources/src_public.yml` path
  from the same physical PostgreSQL relation, and recovers A after B without
  graph or file leakage.
- The Inspector shows connection name, provider and identifier without
  truncating the identity or exposing credentials. Missing or malformed
  canonical identity stays absent rather than being guessed.
- A dbt model with exactly one compatible incoming edge uses that explicit
  relationship for generation and authoring validation. Zero, ambiguous or
  explicitly disconnected origins fail closed.
- Node code navigation uses an explicit persisted workspace path or the exact
  node authoring surface; it never fabricates a path or opens an unrelated
  fallback file.
- Exterior whitespace is rejected at the identity boundary, and reserved
  connection-qualified node-ID collisions fail before file or draft mutation.
- Destructive text-editing keys are owned by the focused Workbench SQL editor;
  `Backspace` and `Delete` do not bubble into React Flow node deletion.

# Executable outcome

The protected live proof starts from a missing graph draft, creates two real
PostgreSQL connections to the same physical relation, imports through both and
checks two distinct persisted nested identities and nodes. It opens both source
Workbenches without forced interaction, proves their exact connections, then
connects a source to a generated dbt model, edits and persists model SQL,
publishes artifacts, previews the plan and opens the exact generated project
file. In the same live session it selects a second real server-granted Project
and Environment, observes an empty graph, creates its dbt Canvas, imports the
same physical source to the same relative YAML path under a distinct Connection,
then returns to the first scope and recovers its two sources, model and file
content. The switch is performed only through the visible workspace selector;
authoritative graph and file reads verify each selected scope. Clearing model
SQL with `Backspace` also proves that the selected model remains in the graph
before the authored SQL is entered. The Add Source dialog and each
connected-source Workbench remain inside
1440x900, 1280x720, 1000x660 and 500x330 viewports. The dialog's bounded content
and Cancel action stay visible; each Workbench keeps the exact Connection fact
and its close action reachable. Axe finds no serious or critical WCAG 2.0/2.1
A/AA violations on either surface, and cancellation leaves the two-source draft
unchanged. The runner uses native Cypress on Windows
because pnpm directory junctions are not resolvable inside the Linux Cypress
container; non-Windows execution retains the container lane.

No database migration, compatibility state, dual-read path, stub, fixture draft,
browser-invented scope or fake-success route is introduced.

The complete Canvas focus config is run with two explicit workers. The local
default worker fan-out made the unchanged 1,000-node layout CPU benchmark exceed
its 30-second budget under contention, while one-worker CI mode exceeded the
20-minute agent command window. Two workers executed every Canvas test with the
same benchmark and unchanged budget successfully; no file or assertion was
excluded.
