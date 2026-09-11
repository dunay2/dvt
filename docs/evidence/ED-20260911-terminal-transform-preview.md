---
title: Protected terminal Transform Preview
status: Accepted
date: 2026-09-11
owners:
  - apps/api
  - apps/web
  - packages/@dvt/contracts
  - packages/@dvt/artifacts
  - packages/@dvt/postgres-projection
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/PreviewPlanUseCase.ts
  - apps/api/src/application/services/resolveAuthorizedDvtPreviewSelection.ts
  - apps/api/src/application/services/resolveDvtTerminalTransformClosure.ts
  - apps/api/src/application/services/dvtPostgresTargetProjectionPublisher.ts
  - apps/api/src/application/services/dvtOperationalWorkloadProjector.ts
  - apps/api/test/integration/dvtProtectedPreview.integration.test.ts
  - apps/web/src/app/views/canvas/canvasDvtPreviewProjection.ts
  - apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v1.ts
  - packages/@dvt/artifacts/src/contentAddressed/FileContentAddressedArtifactStore.ts
  - packages/@dvt/postgres-projection/src/dvtProjection.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api exec vitest run test/application/services/dvtOperationalWorkloadProjector.test.ts test/application/services/dvtPostgresTargetProjectionPublisher.test.ts
    - pnpm --filter dvt-api exec vitest run test/integration/dvtProtectedPreview.integration.test.ts
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts
    - pnpm verify:prepush
---

# Protected terminal Transform Preview

## Decision captured

The `PreviewPlan` command now accepts a protected DVT Canvas provenance and rereads the authorized workspace graph draft. For the first bounded slice, one selected terminal Transform with one governed PostgreSQL Source and one admitted Substrait `ProjectRel` is projected server-side to SQL, stored by content hash, lowered to one ephemeral workload, and submitted to Planner.

The browser sends selection, scope, profile, persistence intent, and protected Canvas provenance. It does not author SQL, Substrait, planner graph nodes, workload payloads, or execution authority. Existing dbt and generic Preview rails remain separate consumers of the same public command.

## What this evidence proves

1. The server fails closed for false topology witnesses, closed edges, non-terminal Transforms, foreign Source plugins, provider mismatch, stale semantic hashes, and unsupported Substrait input.
2. PostgreSQL projection is bounded to the admitted connected-field `ProjectRel` profile and uses explicit protected node bindings.
3. The compiled SQL artifact is written and read through immutable content-addressed storage before Planner admission.
4. Planner persists exactly one `DVT_POSTGRES_OPERATIONAL_WORKLOAD` step for the terminal Transform. Source and Substrait operators do not become steps.
5. Preview exposes the persisted plan identity, artifact reference, protected Canvas provenance, and the real missing executor capability. Start Run stays disabled for that invalid plan.
6. The visible Cypress proof exercises the real HTTP API, PostgreSQL plan store, Planner, and filesystem CAS without browser-authored workload semantics.

## Deliberate boundary

This slice previews and persists the executable intent. It does not execute the PostgreSQL workload or publish a stable Sink. Runtime execution remains owned by GitHub issue #2723, and the wider #2784 acceptance remains open.
