---
title: Governed source identity projection across Canvas authorities
status: Accepted
date: 2026-08-15
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts
  - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
  - apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts
  - apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts
  - apps/api/src/infrastructure/dbt/dbtManifestProjection.ts
  - apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts
evidence:
  tests:
    - pnpm --dir packages/@dvt/contracts exec vitest run test/dbt-project-file-projection.contract.test.ts
    - pnpm --dir apps/api exec vitest run --config vitest.config.ts test/application/services/warehouseSourceYaml.test.ts test/infrastructure/dbt/dbtManifestProjection.test.ts test/application/projectDbtGraphFromFilesUseCase.test.ts test/application/services/getWorkspaceGraphDraftUseCase.authority.test.ts
    - pnpm --dir apps/api exec vitest run test/entrypoints/http/dbtProjectGraphRoutes.test.ts
    - pnpm --dir apps/web exec vitest run src/app/services/dbtProject/dbtProjectGraph.api.test.ts
    - pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts src/app/views/canvas/dbtProjectFileProjection.test.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts
    - pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx
    - pnpm docs:feature-mechanization:implementation -- --feature PTH1-SOURCE-IDENTITY-HOVER-2379
    - pnpm verify:prepush
---

Issue #2379 projects one complete, non-secret source identity into the Canvas
card read model under both graph-draft and dbt-project-files authoring
authorities. The governed dbt source artifact stores only the stable warehouse
connection identifier and the authenticated database principal. The project
graph query resolves the current connection display name from the authorized
workspace catalog, so a rename cannot leave an import-time label in the UI.

The optional projection contract contains database, connection name, schema,
and database user only. It is valid exclusively for dbt source resources and
is strict, so credential references or partial identities are rejected. Legacy
resources without complete authority data remain valid and omit the tooltip.
The graph-draft query applies the same current-name rule without mutating the
persisted draft.

The file-backed HTTP adapter preserves the pre-change strict v1 wire shape by
default, omitting the newly projected physical identifier and source identity.
The current Web adapter explicitly negotiates the shared
`governed-source-identity.v1` feature on the existing query rail. Unknown
feature values fail before analysis. This keeps already-open Web bundles able
to parse responses during a rolling deployment without creating a parallel
endpoint or query service.

The Web layer maps both authority paths into the same graph-card read model and
shared localized Tooltip component. Long identity values wrap rather than
truncate. No URL, password, credential reference, migration, compatibility
union, parallel query rail, stub, or placeholder is introduced.
