---
title: Protected Transform row preview
status: Accepted
date: 2026-09-15
owners:
  - dvt-api
  - dvt-web
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/canvas/TransformDataSample.v1.ts
  - apps/api/src/application/services/previewCanvasTransformRowsUseCase.ts
  - apps/api/src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.ts
  - apps/web/src/app/views/canvas/useCanvasNodeDataSample.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter dvt-api test
    - pnpm --filter '@dvt/web' test
    - pnpm --filter '@dvt/web' exec node ../../scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-transform-data-sample-live.cy.ts
    - pnpm verify:prepush
---

# Protected Transform row preview

## Authority and boundary

[Issue #3237](https://github.com/dunay2/dvt/issues/3237), the
`PreviewCanvasTransformRows` query rail and architecture design
`GH-3237-CANVAS-TRANSFORM-ROW-PREVIEW` govern this slice.

The client sends only Canvas, Transform and limit identities. The API resolves
the authorized current draft and semantic closure, builds the canonical
PostgreSQL projection and executes a bounded read-only sample. Preview, Run,
publication, materialization and a destination target are not prerequisites.

## Proof

- Contract tests reject SQL, connection and credential authority from the
  request.
- Use-case and route tests prove workspace scope, authorization, exact draft
  revision and stable failures.
- PostgreSQL probe tests prove a read-only transaction, a three-second timeout,
  bounded rows, truncation detection and rollback.
- The live browser proof reads three Transform rows and three Source rows into
  independent card-owned tabs without issuing Preview or Run commands.

## No-debt posture

The canonical Transform SQL projection and sample serialization are shared by
their existing owners. No compatibility route, fake row source, stub,
placeholder, TODO, skipped check or rule relaxation was added.
