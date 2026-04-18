---
title: RC-C2 turbo build orchestrator ARC-2 evidence
status: Accepted
date: 2026-04-18
owners:
  - apps/api
  - apps/lineage-worker
  - apps/outbox-worker
  - apps/projector-worker
  - apps/temporal-worker
  - '@dvt/adapter-postgres'
  - '@dvt/adapter-temporal'
  - '@dvt/delivery'
  - '@dvt/engine'
  - '@dvt/run-domain'
  - '@dvt/traceability-service'
arc_level: ARC-2
breaking: false
code_refs:
  - package.json
  - turbo.json
  - apps/web/turbo.json
  - apps/web/vite.config.ts
  - apps/web/src/app/bootstrap/appBootstrapScreen.ts
  - apps/web/src/app/bootstrap/appBootstrapScreen.test.ts
  - scripts/skip-prebuild-if-orchestrated.cjs
  - apps/api/package.json
  - apps/lineage-worker/package.json
  - apps/outbox-worker/package.json
  - apps/projector-worker/package.json
  - apps/temporal-worker/package.json
  - packages/@dvt/adapter-postgres/package.json
  - packages/@dvt/adapter-temporal/package.json
  - packages/@dvt/delivery/package.json
  - packages/@dvt/engine/package.json
  - packages/@dvt/run-domain/package.json
  - packages/@dvt/traceability-service/package.json
  - scripts/README.md
  - docs/guides/testing-and-ci-capabilities.md
evidence:
  tests:
    - pnpm build
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - cmd /c "set VITE_APP_BUILD_DATE=2026-04-18T10:20:00.000Z&& pnpm --filter @dvt/web build"
    - pnpm exec turbo run build --filter=dvt-api
    - pnpm exec turbo run build --filter=dvt-api
    - pnpm exec turbo run build --filter=@dvt/web --force
    - pnpm exec turbo run build --filter=@dvt/web
    - pnpm --filter @dvt/web build
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-lineage-worker build
    - pnpm --filter dvt-outbox-worker build
    - pnpm --filter dvt-projector-worker build
    - pnpm --filter dvt-temporal-worker build
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/delivery build
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/run-domain build
    - pnpm --filter @dvt/traceability-service build
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:arc:evidence:check
    - pnpm verify:prepush
---

# Summary

This slice introduces Turborepo as the root `build` orchestrator and keeps the
fresh-worktree direct-package build baseline intact by making the affected
`prebuild` hooks skip only when `turbo` already owns the current task.

# Key checks

- Root `pnpm build` now routes through `turbo run build`.
- The build graph declares cacheable outputs and the root files that must
  invalidate every build task.
- The web build no longer injects a fresh timestamp into every bundle, and the
  `@dvt/web` task hash now includes package-local `.env*` files plus `VITE_*`
  environment variables, including explicit build metadata.
- The bootstrap screen now hides the build-date line when no explicit build
  metadata is injected, instead of showing `Build unknown`.
- Direct package `build` commands retain their dependency fallback outside
  `turbo`.

# Validation results

- `pnpm build` still fails first at the known pre-existing
  `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts:382` `TS2532` defect; no
  new root-build failure was introduced by the Turbo slice.
- `pnpm --filter @dvt/web typecheck`, `pnpm --filter @dvt/web test`, and
  `pnpm --filter @dvt/web build` all passed, so the web-target code and UI
  guardrail changed for this follow-up are covered directly.
- `pnpm --filter @dvt/web build` with a temporary
  `apps/web/.env.production.local` carrying `VITE_APP_BUILD_DATE` emitted the
  injected ISO timestamp into the bundle, so package-local env-based build
  metadata now uses the same hashed path as the rest of the web target.
- `cmd /c "set VITE_APP_BUILD_DATE=2026-04-18T10:20:00.000Z&& pnpm --filter
@dvt/web build"` also emitted the injected timestamp, so one-shot shell env
  injection still works after moving build metadata onto the `loadEnv(...)`
  path.
- Re-running `pnpm exec turbo run build --filter=dvt-api` restored the filtered
  graph from the local Turbo cache, confirming that the declared `outputs`
  surface is active.
- Re-running `pnpm exec turbo run build --filter=@dvt/web` after mutating a
  temporary `apps/web/.env.production.local` changed the web task hash from a
  forced build to a real cache miss, and the emitted bundle switched from
  `tenant-3010` to `tenant-4010` as expected.
- `pnpm docs:status:generate` refreshed generated code-state after adding
  `apps/web/turbo.json`, so the governed structural inventory stays aligned
  with the new workspace file.
- Direct package `build` validation passed for every touched workspace except
  `dvt-outbox-worker`, which still fails at the same pre-existing `TS2532`
  baseline.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260418-TURBO-BUILD-ORCHESTRATION-CACHE-DRIFT.yaml`.
