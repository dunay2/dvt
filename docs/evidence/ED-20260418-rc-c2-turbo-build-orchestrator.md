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
    - pnpm exec turbo run build --filter=dvt-api
    - pnpm exec turbo run build --filter=dvt-api
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
- Direct package `build` commands retain their dependency fallback outside
  `turbo`.

# Validation results

- `pnpm build` still fails first at the known pre-existing
  `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts:382` `TS2532` defect; no
  new root-build failure was introduced by the Turbo slice.
- Re-running `pnpm exec turbo run build --filter=dvt-api` restored the filtered
  graph from the local Turbo cache, confirming that the declared `outputs`
  surface is active.
- Direct package `build` validation passed for every touched workspace except
  `dvt-outbox-worker`, which still fails at the same pre-existing `TS2532`
  baseline.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260418-TURBO-BUILD-ORCHESTRATION-CACHE-DRIFT.yaml`.
