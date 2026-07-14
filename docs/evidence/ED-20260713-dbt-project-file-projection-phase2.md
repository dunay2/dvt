---
title: dbt project file projection phase two contracts and API
status: Accepted
date: 2026-07-13
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringAuthorityBinding.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DbtProjectGraphProjection.v1.ts
  - apps/api/src/application/ports/dbtProjectAnalysis.ts
  - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
  - apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts
  - apps/api/src/entrypoints/http/dbtProjectGraphRoutes.ts
  - apps/web/src/app/views/canvas/DbtProjectFileCanvas.tsx
  - apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx
  - apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api test:arch
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm exec cypress run --config-file apps/web/cypress.config.ts --spec apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    - pnpm docs:feature-mechanization -- --feature E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713
    - pnpm verify:prepush
---

# Summary

This evidence records the additive authority-binding and dbt project graph
projection contracts plus the protected server-side analysis query required by
phase two of ADR-0060.

# Scope

- Canvas authority is explicit and mutually exclusive between graph draft and
  dbt project files.
- `ProjectDbtGraphFromFiles` reuses workspace scope authorization and does not
  infer file authority from project contents.
- The analyzer runs `dbt parse` with a server-managed profile, sanitized
  environment, bounded output and timeout, and isolated target/log paths.
- Pre-existing project `target/manifest.json` files are ignored; only the
  current isolated invocation can produce the projection.
- Valid, invalid, and unavailable analysis remain explicit. Phase two does not
  enable file-backed Preview, Run, or visual mutation.
- Resources and dependencies use dbt `unique_id`; projections are validated for
  duplicate identity and missing edge endpoints.

# Authority

The canonical behavior and DoD remain in ADR-0060, the mandatory dbt project
roundtrip plan, and the Planning DB `ProjectDbtGraphFromFiles` rail. This file is
validation evidence only.

# Browser Evidence

The first browser pass exposed overlapping projected nodes. The corrected
projection applies deterministic layout while preserving the file-authoritative
graph.

![Overlapping file projection before the layout correction](./assets/20260713-dbt-project-file-projection-phase2/01-layout-overlap-before.png)

![Deterministic file projection after the layout correction](./assets/20260713-dbt-project-file-projection-phase2/02-layout-after.png)

The contextual Code split initially collapsed the graph surface. The corrected
layout keeps the graph visible beside the file explorer and editor.

![Collapsed graph before the contextual split correction](./assets/20260713-dbt-project-file-projection-phase2/03-code-split-blank-before.png)

![Graph preserved beside the contextual Code split](./assets/20260713-dbt-project-file-projection-phase2/04-code-split-after.png)
