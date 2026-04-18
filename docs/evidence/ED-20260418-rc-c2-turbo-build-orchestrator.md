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
  - .github/workflows/test.yml
  - tools/ci/scope-config.mjs
  - tools/ci/workflow-pattern-parity.test.mjs
  - tools/ci/workflow-scope-classification.test.mjs
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
- `Test Suite` full-root lanes now run `pnpm build`, so merge-gate coverage
  executes the same Turbo-backed root build path instead of the retired
  `pnpm -r build` path.
- `CI - Code Quality` now also treats `turbo.json` as both `any_code` and
  `workspace_global`, so Turbo graph changes cannot fall through to an empty
  affected-workspace matrix while `Test Suite` runs the Turbo-backed root path.
- The shared test-scope routing now treats both `turbo.json` and
  `scripts/skip-prebuild-if-orchestrated.cjs` as `root_config` inputs, so PRs
  that change the Turbo graph or its orchestration helper cannot bypass the
  `Test Suite` full-root build lane.
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

- On the current mainline integration baseline, `pnpm build` passes, so the
  Turbo-backed root build path is both locally green and executable by the
  `Test Suite` merge gate after the workflow follow-up.
- `computeBooleanScope(...)` now classifies `turbo.json` as `any_code=true`
  under workflow scope, and `computeWorkspaceMatrix(['turbo.json'])` expands to
  the full workspace matrix, so the `CI - Code Quality` gate stays aligned with
  the Turbo-backed root build policy.
- `computeBooleanScope(...)` now classifies both `turbo.json` and
  `scripts/skip-prebuild-if-orchestrated.cjs` as `any_test=true` and
  `root_config=true`, and the CI-scope regression tests lock that coverage in.
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
- Direct package `build` validation now also passes for `dvt-outbox-worker` on
  the current mainline integration baseline; the earlier `TS2532` blocker was
  resolved independently after the original Turbo slice landed.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260418-TURBO-BUILD-ORCHESTRATION-CACHE-DRIFT.yaml`.
