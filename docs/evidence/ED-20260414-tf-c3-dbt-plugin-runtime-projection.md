---
title: Project dbt plugin runtime context at the Temporal adapter boundary
status: Accepted
date: 2026-04-14
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFailures.ts
  - packages/@dvt/adapter-temporal/src/activities/activityTypes.ts
  - packages/@dvt/adapter-temporal/src/activities/dbtStepActivity.ts
  - packages/@dvt/adapter-temporal/src/activities/gatewayStepActivity.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivityValidation.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/package.json
  - packages/@dvt/adapter-temporal/tsconfig.json
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/dbtRuntimeFixtures.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/runtimeState.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/waitForCondition.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/workflowArtifacts.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/vitest.config.ts
  - docs/planning/closeouts/20260414-tf-c3-dbt-plugin-runtime-projection-closeout.md
evidence:
  tests:
    - pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/src/activities/*.ts packages/@dvt/adapter-temporal/src/index.ts packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts packages/@dvt/adapter-temporal/test/helpers/integration/*.ts packages/@dvt/adapter-temporal/test/helpers/testExecutors.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
    - pnpm --filter @dvt/adapter-temporal run typecheck:test
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbtRuntimeFixtures.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.test.ts --testNamePattern "dbt step|runExecutionContext"
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration:local
    - pnpm --filter @dvt/adapter-temporal test:integration:transformation
    - pnpm docs:status:generate
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; $json = node tools/ci/arc-check.mjs; $enc = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllLines((Join-Path (Get-Location) 'arc.json'), $json, $enc)
    - $env:ARC_JSON='arc.json'; node tools/ci/doc-check.mjs
    - pnpm docs:workboard:generate
    - pnpm docs:gov:links:changed
    - pnpm lint:md:changed
    - pnpm verify:prepush
---

## Summary

`TF-C3` now has a real provider-boundary runtime projection for DBT steps.

The change is deliberately narrow:

1. `@dvt/engine` still owns only admission and contract validation for
   `runExecutionContextRef`;
2. `@dvt/adapter-temporal` now resolves the immutable
   `RunExecutionContext` through the artifacts-owned reader seam when a DBT
   step executes; and
3. the adapter projects `pluginContexts.dbt` into an adapter-owned
   `DbtPluginRunner` instead of preserving the older DBT no-op truth.

This keeps DBT behavior out of kernel semantics while replacing the old
placeholder path with an explicit runtime handoff that fails closed when the
required plugin context or runtime wiring is absent.

The follow-on SRP refactor keeps that behavior intact while removing the
activity and integration-harness monoliths that had grown around it. The public
import paths remain stable through barrel files, but the responsibilities now
live in narrower modules for dispatch, validation, DBT runtime projection, and
test fixtures.

The follow-up hardening in the same slice also fixes the integration-fixture
drift that the refactor exposed: DBT test refs are now run-scoped and hashed
from the canonical `RunExecutionContext` bytes, and the fake reader only
resolves explicitly registered refs instead of returning a single ambient
context for every run. The same fixture seam now registers plan bytes per
`PlanRef` instead of one worker-global blob, rejects bindings where a
precomputed `runExecutionContextRef` no longer matches the registered plan, and
the adapter preserves the engine rejection reason instead of collapsing it to a
message key. That hardening now also treats optional `PlanRef.sizeBytes` as
non-identity metadata in fixture lookups and computes DBT fixture ref hashes
through RFC-8785/JCS canonicalization instead of property-order-sensitive
`JSON.stringify(...)`.

## What this evidence closes

1. The gap between `runExecutionContextRef` admission and actual DBT step-time
   consumption inside the Temporal adapter.
2. The fake-success posture where DBT step tests could pass without proving a
   plugin-backed runtime handoff.
3. The SRP drift where step activity orchestration and time-skipping test
   fixtures had collapsed into two large files with mixed concerns.
4. The packaging drift where `@dvt/adapter-temporal` depended on the reader
   seam conceptually but did not compile it through an explicit workspace
   dependency and TS path mapping.
5. The fixture drift where two runs on the same worker could silently share one
   synthetic DBT execution context because the fake reader ignored the incoming
   `runExecutionContextRef`.
6. The fixture drift where distinct `PlanRef` values on the same worker could
   silently fetch the same plan blob, and where tests could register a stale
   `runExecutionContextRef` against a different plan without failing closed.
7. The fixture drift where the same logical `PlanRef` could miss lookup if
   optional `sizeBytes` metadata was absent, and where a harmless property-order
   refactor could change synthetic `runExecutionContextRef.sha256` values.
8. The fixture drift where multi-run DBT tests could still fall back to one
   shared blob if a binding omitted `planBytes`, and where the canonical hash
   path reached into sibling package source instead of the public
   `@dvt/crypto` boundary.

The latest hardening closes that last gap with two mature packaging moves:

- the DBT integration seam now has distinct single-run and multi-run fixture
  entry points, so multi-run registration requires per-binding `planBytes`
  instead of silently inheriting a worker-global default; and
- `@dvt/adapter-temporal` now resolves canonical hashing through the public
  `@dvt/crypto` package boundary, with workspace dependency, TS path mapping,
  and Vitest aliasing aligned to the already-built package artifact.
- the DBT fixture context itself is now built through the governed
  `parseRunExecutionContext(...)` contract parser and backed by an explicit
  package test typecheck command, so branded contract drift shows up in the
  package validation path instead of only in editor diagnostics.

## What this evidence does not close

1. Production composition of a real DBT plugin host or sandbox runtime.
2. Rollout, marketplace, or lifecycle controls for third-party plugin
   execution.
3. Remaining `TF-C3` follow-up work around production runtime wiring and
   broader execution-boundary hardening.
