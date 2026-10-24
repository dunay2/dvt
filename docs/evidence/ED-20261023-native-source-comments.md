---
title: Compact native Source inspection with provider comments
status: draft
date: 2026-10-23
owners:
  - API
  - Web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts
  - apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts
  - apps/api/src/application/services/warehouseSourceRebindPlan.ts
  - apps/web/src/app/views/canvas/SourceOverviewPanel.tsx
  - apps/web/src/app/components/inspector/SourceColumnDetail.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.test.ts test/schema-sync.test.ts
    - pnpm --filter dvt-api exec vitest run test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts test/application/services/rebindWarehouseSourceUseCase.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/SourceOverviewPanel.test.tsx src/app/components/inspector/SourceColumnsPanel.test.tsx src/app/components/inspector/sourceColumnFacts.test.ts src/app/components/inspector/SourceColumnsPanel.architecture.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/sourceLivePreviewPostgres.proof.ts -t "discovers real relation and column comments"
    - node tools/ci/run-web-cypress-native.mjs --browser chrome --spec cypress/e2e/canvas/canvas-source-inspector-order.cy.ts
    - pnpm validate:contracts
---

# Native Source Comments

Authority and design rationale:
[GH-2937 active native Canvas slice](https://github.com/dunay2/dvt/issues/2937#issuecomment-6370074393),
Planning DB design `GH-2937-NATIVE-SOURCE-COMMENTS`, ADR-0058 and the existing
catalog, import, rebind and Canvas presentation rails.

The optional contract fields preserve nonblank provider text without interpreting
markup. One batched column query replaces two duplicate implementations and reads
comments by actual relation OID/attribute number. Native Source import persists
the table comment separately from the DVT description. Rebind replaces or removes
provider comments without changing column order or logical identity.

The Overview uses compact full-width sections. Column rows indicate comment
presence; detail displays the complete escaped plain text. Authored dbt
descriptions and generic node comments are not relabeled as provider comments.
File-authoritative dbt projection and DVT annotation editing are outside this
native Canvas slice. Existing Sources are not silently refreshed; this is the
metadata observed at import/rebind.

Focused contract, provider, persistence and UI tests establish acceptance, missing
values, ownership, escaping and stale-comment removal. The disposable PostgreSQL
proof exercises schema paging, search and inspection with a dropped column before
the documented field, then verifies comment removal. Its database is removed in
`finally`. The single browser scenario verifies layout and existing ordering.

Execution results and exact limitations are recorded in the governing GitHub
issue. Listed commands are validation scope, not a claim that every gate passed.
