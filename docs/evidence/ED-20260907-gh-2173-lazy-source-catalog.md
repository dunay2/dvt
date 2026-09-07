---
title: GH-2173 bounded lazy source catalog evidence
status: Accepted
date: 2026-09-07
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
planning_type: evidence
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.ts
  - packages/@dvt/contracts/test/source-import/SourceObjectCatalog.test.ts
  - apps/api/src/application/services/WarehouseConnectionSourceObjectReader.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts
  - apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts
  - apps/web/src/app/services/workspace/workspacePorts.api.ts
  - apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts
  - apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/WarehouseConnectionSourceObjectReader.test.ts test/application/services/rebindWarehouseSourceUseCase.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/web exec vitest run src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.navigation.test.tsx src/app/components/SourceImportWizard.test.tsx src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts src/app/services/workspace/workspacePorts.api.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
---

# GH-2173 bounded lazy source catalog evidence

## Accepted evidence boundary

This evidence accepts the observed contract, focused API, and focused Web behavior listed
below. It does not claim that the complete #2173 task or PR closeout is green. The open risk
entry `R-20260907-GH-2173-LAZY-SOURCE-CATALOG` owns the unproved guarantees and remaining
hardening work.

## Observed results

All results below were observed on 2026-09-07 against the current integrated worktree:

- canonical contract test: 1 file, 16 tests passed;
- canonical contract typecheck: passed;
- focused API reader, rebind, Postgres probe and HTTP route tests: 4 files, 66 tests passed;
- API typecheck: passed;
- API lint: passed;
- focused Web wizard, catalog model, catalog view and API-port tests: 6 files, 78 tests
  passed;
- Web typecheck: passed;
- Web lint: passed;
- absence scan over `apps/web` and the source-import contract source/tests found no
  `listSourceObjects`, `SourceObjectCatalog.v1`, suffixed catalog type name, request name or
  response name.

## Behavior proved by this evidence

The observed tests prove this bounded slice:

- the catalog contract has one unsuffixed `SourceObjectCatalogRequest` and
  `SourceObjectCatalogResponse` authority;
- requests discriminate schema summary, schema page and name search operations;
- responses discriminate schema lists and object pages with explicit truncation/cursor
  consistency;
- the Postgres probe filters schema pages and name searches before loading object detail and
  does not use its exact row-count fallback for catalog browsing in the covered scenarios;
- catalog cursors are HMAC-SHA256 signed and bound to tenant, project, environment,
  connection, database, request kind and exact filter; signature or context mismatch is
  rejected before catalog SQL executes;
- the HTTP route parses the canonical request and returns the canonical response;
- the Web port serializes canonical catalog requests and validates canonical responses;
- the Web wizard, model and view cover schema summaries, bounded object pages, global search
  and visible pagination.

## Guarantees not accepted here

This evidence does not claim or prove:

- an explicit unavailable-metric contract or retention of a relation when every row-count
  strategy is unavailable;
- provider query-count, response-byte or latency benchmarks for 10-object or 1,000-object
  catalogs;
- retirement of persisted eager `sourceObjects` snapshots from the warehouse connection
  catalog;
- targeted import resolution that avoids materializing the complete live catalog;
- full package suites, live browser proof, `pnpm verify:prepush` or final CI state.

Those items remain open and must not be inferred from this document's `Accepted` status.
