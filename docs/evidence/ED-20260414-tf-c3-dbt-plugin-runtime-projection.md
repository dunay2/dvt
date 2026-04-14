---
title: Project dbt plugin runtime context at the Temporal adapter boundary
status: Accepted
date: 2026-04-14
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/package.json
  - packages/@dvt/adapter-temporal/tsconfig.json
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
  - packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
  - docs/planning/closeouts/20260414-tf-c3-dbt-plugin-runtime-projection-closeout.md
evidence:
  tests:
    - pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/src/activities/stepActivities.ts packages/@dvt/adapter-temporal/src/index.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration:transformation
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs > arc.json
    - $env:ARC_JSON='arc.json'; node tools/ci/doc-check.mjs
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm docs:gov:links:changed
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

## What this evidence closes

1. The gap between `runExecutionContextRef` admission and actual DBT step-time
   consumption inside the Temporal adapter.
2. The fake-success posture where DBT step tests could pass without proving a
   plugin-backed runtime handoff.
3. The packaging drift where `@dvt/adapter-temporal` depended on the reader
   seam conceptually but did not compile it through an explicit workspace
   dependency and TS path mapping.

## What this evidence does not close

1. Production composition of a real DBT plugin host or sandbox runtime.
2. Rollout, marketplace, or lifecycle controls for third-party plugin
   execution.
3. Remaining `TF-C3` follow-up work around production runtime wiring and
   broader execution-boundary hardening.
