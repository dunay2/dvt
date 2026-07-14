---
title: dbt project import phase three contracts and runtime
status: Accepted
date: 2026-07-14
owners:
  - '@dvt/contracts'
  - dvt-api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectImport.v1.ts
  - packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v2.ts
  - apps/api/src/application/services/validateDbtProjectImportUseCase.ts
  - apps/api/src/application/services/importDbtProjectUseCase.ts
  - apps/api/src/application/services/importWarehouseSourcesUseCase.ts
  - apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts
  - apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:arch
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - node --test scripts/planning-db-migrate.test.cjs
    - pnpm verify:prepush
---

# Summary

This evidence records the phase-three contract and protected API foundation for
validating and importing a workspace-local dbt project, persisting one explicit
Canvas authoring authority, and importing warehouse sources through the active
authority without dual writes.

# Scope

- Validation receipts bind the inspected project inventory to the later import
  command; an import cannot silently validate a different project state.
- Canvas authoring authority is persisted and mutually exclusive between graph
  draft and dbt project files.
- Workspace file batches apply atomically and restore their original
  preconditions after rollback.
- Source Import V2 delegates to exactly one authority strategy. Graph authority
  mutates the draft; file authority writes governed dbt source files and refreshes
  the projection without mutating the draft.
- HTTP routes enforce workspace scope, stable validation errors, idempotency, and
  conflict rejection.

# Authority

The canonical behavior and Definition of Done remain in ADR-0060, the mandatory
dbt project roundtrip plan, the governed component specification, and the
Planning DB rails `ValidateDbtProjectImport`, `ImportDbtProject`,
`ImportWarehouseSources`, and `ProjectDbtGraphFromFiles`. This file is validation
evidence only.
