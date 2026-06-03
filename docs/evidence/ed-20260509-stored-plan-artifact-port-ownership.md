---
title: Stored plan artifact port ownership canonicalization
status: Accepted
date: 2026-05-09
owners:
  - packages/@dvt/artifacts
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts
  - apps/api/src/application/services/PreviewPlanUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-api test
---

## Summary

Stored-plan artifact lifecycle and materialization now have one canonical port
home in `@dvt/artifacts`. API, planner, and engine-local duplicate ports were
removed rather than retained as compatibility shims.

## Outcome

- `IStoredPlanArtifactReader`, `IStoredPlanArtifactWriter`, and
  `IStoredPlanArtifactStore` own artifact fetch and validation-state
  transitions.
- Engine owns only `IPlanIntegrityValidator`, which consumes a scoped artifact
  reader before provider dispatch.
- Tests and architecture docs now require scoped `ScopedPlanRef` input for
  artifact fetches and validation.
