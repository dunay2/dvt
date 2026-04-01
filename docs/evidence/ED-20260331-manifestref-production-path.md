---
title: manifestRef restored as the production planner path in apps/api
status: Accepted
date: 2026-03-31
owners:
  - packages/@dvt/planner
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
evidence:
  tests:
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/planner test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:integration
    - pnpm --filter dvt-api test:arch
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

## Summary

`manifestRef` is now the real planner path in `apps/api` instead of a
documented-but-unwired envelope field.

The slice keeps `Planner` IO-free, keeps `PlannerFacade` as the resolver-owning
application boundary, adds a concrete API artifact resolver, and maps
predictable artifact-resolution failures to the existing `plan_rejected`
surface.

## Delivered Changes

- Added a stable planner export,
  `derivePlannerGraphSourceFromManifest(manifest)`, so inline `manifest` and
  resolved `manifestRef` share one canonical normalization rule.
- Added `ManifestArtifactResolver` in `apps/api` with `file://` support outside
  production and `s3://` support in all environments.
- Enforced raw-byte SHA-256 validation before manifest parsing.
- Added typed resolver failures for unsupported scheme, file-scheme prohibition,
  artifact missing, integrity mismatch, and invalid payload.
- Mapped those predictable failures in `PlannerBackedStartRunUseCase` to
  `plan_rejected / REJECTED` with stable cause tokens.
- Wired the resolver into `buildProtectedRuntimeModule` so protected runtime
  start-run requests can use `manifestRef`.

## Validation Focus

- Planner helper export and manifest normalization semantics
- API resolver unit coverage for file, S3, mismatch, missing, and invalid
  payload paths
- Use-case coverage for predictable rejection mapping
- Planner-to-engine integration using a real file-backed `manifestRef`
- Protected runtime integration for `POST /runs/start` with `manifestRef`
