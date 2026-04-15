---
title: Compose production Temporal worker and DBT CLI host under TF-C3
status: Accepted
date: 2026-04-14
owners:
  - apps/temporal-worker
  - packages/@dvt/adapter-temporal
  - packages/@dvt/artifacts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/artifacts/src/runtime/ArtifactBackedRunExecutionContextReader.ts
  - packages/@dvt/artifacts/src/runtime/ArtifactBackedDbtProjectBundleReader.ts
  - apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts
  - apps/temporal-worker/src/server.ts
  - docs/runbooks/temporal-worker-dbt-plugin-runtime-20260414.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts build
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/adapter-temporal typecheck:test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration:local
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/DbtCliPluginRunner.test.ts test/activities.test.ts test/dbtRuntimeFixtures.test.ts test/integration.time-skipping.test.ts
    - pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.test.ts test/core/WorkflowEngine.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts
    - pnpm --filter dvt-api test
    - pnpm exec eslint --max-warnings 0 apps/api/test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts packages/@dvt/adapter-temporal/src/activities/activityTypes.ts packages/@dvt/adapter-temporal/src/activities/dbtStepActivity.ts packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts packages/@dvt/adapter-temporal/test/DbtCliPluginRunner.test.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts packages/@dvt/adapter-temporal/test/helpers/integration/dbtRuntimeFixtures.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts packages/@dvt/artifacts/src/ports/IDbtProjectBundleReader.ts packages/@dvt/artifacts/src/runtime/ArtifactBackedDbtProjectBundleReader.ts packages/@dvt/artifacts/src/runtime/readArtifactBytes.ts packages/@dvt/artifacts/test/runExecutionContextReaders.test.ts packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts packages/@dvt/contracts/src/schema-packs/common.ts packages/@dvt/contracts/src/types/artifacts.ts packages/@dvt/contracts/src/types/contracts.ts packages/@dvt/contracts/src/validation.ts packages/@dvt/contracts/src/validation/runtime.ts packages/@dvt/contracts/test/validation/execution-context.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.test.ts
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - $env:ARC_JSON='arc.json'; node tools/ci/doc-check.mjs
    - pnpm docs:gov:links:changed
    - pnpm lint:md:changed
    - pnpm verify:prepush
---

## Summary

`TF-C3` is no longer only an adapter seam plus fixture story.

The repo now contains the in-repo production-style topology that the phase-2
DBT path needed:

1. shared artifact-backed runtime readers live in `@dvt/artifacts`
2. `apps/api` consumes the shared execution-context reader instead of carrying
   a second local artifact loader
3. `apps/temporal-worker` is the canonical worker composition root
4. DBT runs through an adapter-owned CLI host behind `DbtPluginRunner`

This keeps DBT out of engine-kernel semantics while making the real worker path
explicit, testable, and operable.

## What this evidence closes

1. The repo now has a canonical worker composition root for the Temporal
   provider path.
2. The worker can compose `TemporalWorkerHost`, artifact-backed execution input
   readers, state-store wiring, and an adapter-owned DBT host without involving
   `apps/api` lifecycle.
3. `DbtStepActivity` no longer depends on test-only host wiring; the real host
   path exists in-repo.
4. Operational health/readiness and metrics now exist for the standalone worker
   path through `/healthz`, `/readyz`, and `/metrics`.
5. The worker has a canonical runbook baseline, so the new topology is not only
   code but also operator-facing truth.
6. `pluginContexts.dbt.projectBundleRef` is now an immutable content-addressed
   bundle reference with `sha256`, and its locator is constrained to the
   canonical tenant-scoped artifact path, so the worker no longer executes
   mutable bundle bytes behind a stable URI.
7. The DBT bundle reader now binds reads to the configured artifact-store
   bucket/root in the worker runtime, so payloads cannot redirect the worker
   to a foreign store while preserving the same tenant-scoped key shape.
8. Runtime artifact readers no longer create a fresh S3 client per read; the
   hot path now uses a long-lived client instance/fallback instead of
   read-scoped churn.
9. DBT-bearing runs are now rejected at admission when
   `runExecutionContextRef` is missing or when the resolved
   `pluginContexts.dbt.projectBundleRef` does not align to the run tenant,
   canonical tenant-scoped bundle locator, or configured artifact store.

## What remains open

1. Environment rollout and canary evidence for the standalone worker.
2. Broader deployment wiring outside the repo.
3. Richer DBT result-evidence materialization beyond the current `StepResult`
   boundary.
4. Accepted residual debt: `recoverRun` still depends on live API artifact-store
   configuration when rechecking DBT bundle binding, so sanctioned store
   changes can invalidate recovery of already-accepted runs even when the
   bundle bytes stay valid.
5. Accepted residual debt: the protected API does not yet fail fast at startup
   when DBT bundle-store configuration is missing or inconsistent; the current
   rejection still happens on the first DBT-bearing admission request.

## System effect

The `TF-C3` story now has four grounded layers:

- protected ingress still admits and starts by `PlanRef`
- `@dvt/artifacts` owns the immutable runtime artifact readers
- `apps/temporal-worker` owns worker lifecycle and operability
- `@dvt/adapter-temporal` owns DBT execution through an adapter-local host

That is the mature boundary split this phase needed.
