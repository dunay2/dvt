---
title: Exact governed connection binding for imported dbt sources
status: Accepted
date: 2026-08-16
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts
  - packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts
  - apps/api/src/application/services/warehouseSourceImportPlan.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts
  - apps/web/src/app/views/canvas/canvasDbtSourceImportContinuationStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm docs:feature-mechanization:implementation -- --feature PTH1-DBT-SOURCE-CONNECTION-BINDING
    - pnpm --dir apps/web exec cypress run --headed --browser chrome --config-file cypress.config.ts --config baseUrl=http://127.0.0.1:5173 --spec cypress/e2e/canvas/canvas-dbt-source-connection-binding.cy.ts
    - pnpm verify:prepush
---

Issue #2397 reuses the existing dbt project import, warehouse connection,
warehouse source import, and file-backed graph projection rails. Validation now
reports a deterministic, non-secret inventory of declared source tables. After
the project establishes file authority, the Web route composition opens the
existing governed Source Import flow with that inventory.

One explicitly selected connection must expose a unique live warehouse object
for every declared database, schema, and table. The API revalidates the exact
coverage, requires the governed database user, and enriches each matching table
in its original YAML file with `dvt_source_identity`. It preserves existing dbt
semantics and rejects partial, ambiguous, duplicate, stale, cross-database, or
graph-draft targets before mutation.

The dbt analyzer remains the graph authority and projects one node per manifest
source. Browser acceptance covers two tables in English at 1366x768 and Spanish
at 1920x1080, including WCAG A/AA serious and critical checks. No connection is
inferred from YAML, no credential material is persisted, and no parallel source
file, command rail, migration, compatibility store, stub, or fake success path
is introduced.
