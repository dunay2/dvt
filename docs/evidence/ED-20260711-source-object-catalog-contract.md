---
title: Provider-neutral source object catalog contract
status: Accepted
date: 2026-07-11
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts
  - apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts
  - apps/web/src/app/services/workspace/workspacePorts.api.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceObjectCatalog.v1.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.workspace-services.config.ts src/app/services/workspace/workspacePorts.api.test.ts
    - pnpm --filter @dvt/web test:e2e:source-import:live
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

This evidence records the ARC-2 hard cut from a relational-only warehouse table
DTO to the shared provider-neutral `SourceObjectCatalogResponse` v1 contract.

# Scope

- Source discovery uses discriminated relation, file, endpoint, and stream
  locators with one stable `objectId` language.
- Catalog query responses carry `contractVersion: 1`; unversioned arrays and
  unsupported versions fail at the Web boundary.
- Metric evidence always contains row count and byte size with explicit
  provenance, method, confidence, observation time, and byte basis.
- Import selections contain only unique object IDs. API resolves all locator,
  columns, and metric authority from the server catalog.
- The current DBT source import strategy remains relation-only and rejects
  unsupported locator kinds before graph or workspace-file mutation.
- Postgres-specific discovery and estimation stay in the Postgres adapter; the
  shared contract contains no Postgres query or storage semantics.

# Validation

The frontmatter lists the focused contract, API, Web, browser, governance, and
pre-push proof required before this slice can be closed.
