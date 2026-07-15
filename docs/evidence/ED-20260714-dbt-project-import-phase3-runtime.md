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
  - apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts
  - apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts
  - apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts
  - apps/api/src/entrypoints/http/dbtProjectImportRoutes.ts
  - apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:arch
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api exec vitest run test/app/protectedRuntimeComposition.test.ts
    - pnpm --filter dvt-api exec vitest run test/entrypoints/http/workspaceGraphDraftRoutes.test.ts
    - pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportReplay.test.ts
    - DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api exec vitest run test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts
    - DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts
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
  draft and dbt project files. Both stores acquire the same scoped transaction
  lock and revalidate the competing persistence state before commit.
- Workspace file batches apply atomically and restore their original
  preconditions after rollback. Equivalent retries also replay after successful
  publication because changing CAS revisions do not redefine command intent.
- Source Import V2 delegates to exactly one authority strategy. Graph authority
  mutates the draft; file authority writes governed dbt source files and refreshes
  the projection without mutating the draft.
- HTTP routes enforce workspace scope, stable validation errors, idempotency,
  conflict rejection, and the protected runtime rate limit before repeated
  authorization.
- A completed import persists its exact accepted result. Equivalent retries
  replay that result before inspecting later project-file changes, while a
  reused key with another request hash fails closed.

# Authority

The canonical behavior and Definition of Done remain in ADR-0060, the mandatory
dbt project roundtrip plan, the governed component specification, and the
Planning DB rails `ValidateDbtProjectImport`, `ImportDbtProject`,
`ImportWarehouseSources`, and `ProjectDbtGraphFromFiles`. This file is validation
evidence only.
