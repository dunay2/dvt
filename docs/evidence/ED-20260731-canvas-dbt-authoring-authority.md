---
title: Explicit Canvas dbt authoring authority
status: Accepted
date: 2026-07-31
owners:
  - '@dvt/contracts'
  - dvt-api
  - dvt-web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts
  - packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts
  - apps/api/src/application/services/canvasAuthoringAuthorityPolicy.ts
  - apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts
  - apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts
  - apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts
  - apps/web/src/app/views/canvas/canvasDraftReadModel.ts
  - apps/web/src/app/views/canvas/canvasDraftRepository.ts
  - apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts
  - apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test:ci
    - pnpm --filter @dvt/web test:canvas-unit:run
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/web lint
    - pnpm verify:prepush
---

# Summary

Canvas dbt authoring now exposes one canonical authority resolution. Graph
artifact publication is accepted only for the active Canvas whose persisted
authority is `graph-draft`. Imported or opened dbt project files remain a
separate file-backed surface and cannot become graph authority implicitly.

# Decision

- `GetWorkspaceGraphDraft` returns the canonical authority resolution with the
  draft read model.
- `PublishGraphDbtWorkspaceArtifacts` carries the active `canvasId` and checks
  stored authority plus graph membership before any workspace-file mutation.
- Missing, mixed, file-backed, or mismatched authority fails closed.
- A valid graph-managed SQL marker proves divergence state only. It cannot
  grant authority or authorize replacement of external SQL.
- The API re-reads current files and validates marker ownership before applying
  the existing atomic compare-and-swap publication command.
- Canvas identity and dbt project root authority remain locked from server-side
  authorization through the complete compare-and-swap publication.
- Web planning, preview, run, and code-edit posture consume the canonical
  authority instead of reconstructing it from route state.
- Web confirms a successful save by re-reading the canonical draft revision and
  authority before updating its query cache.

# Failure semantics

- Authority refusal performs no file mutation.
- Invalid or missing graph-managed SQL markers perform no publication.
- Revision conflicts remain typed compare-and-swap conflicts.
- Imported dbt project files remain inspectable without acquiring graph
  authoring rights.
- There is no adoption, transition, replacement, or compatibility heuristic.

# Scope boundary

This slice reuses `GetWorkspaceGraphDraft` and
`PublishGraphDbtWorkspaceArtifacts`. It adds no endpoint, command bus, secondary
authority store, planning migration, or browser-side authority override.
