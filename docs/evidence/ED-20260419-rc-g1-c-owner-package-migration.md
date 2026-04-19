---
title: RC-G1-C owner-package migration
status: Accepted
date: 2026-04-19
owners:
  - packages/@dvt/contracts
  - packages/@dvt/delivery
  - packages/@dvt/traceability-service
  - packages/@dvt/artifacts
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/delivery/src/contracts.ts
  - packages/@dvt/traceability-service/src/lineage/contracts.ts
  - packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts
  - packages/@dvt/traceability-service/src/lineage/LineageOutboxObserver.ts
  - packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts
  - packages/@dvt/contracts/src/index.ts
  - eslint.config.cjs
  - docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md
  - docs/planning/state/agent-lane-a.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/delivery build
    - pnpm --filter @dvt/delivery test
    - pnpm --filter @dvt/traceability-service build
    - pnpm --filter @dvt/traceability-service test
    - pnpm --filter @dvt/artifacts build
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-outbox-worker typecheck
    - pnpm --filter dvt-outbox-worker test
    - pnpm --filter dvt-lineage-worker typecheck
    - pnpm --filter dvt-lineage-worker test
    - pnpm exec eslint "packages/@dvt/contracts/src/**/*.ts" "packages/@dvt/contracts/test/**/*.ts" "packages/@dvt/delivery/src/**/*.ts" "packages/@dvt/delivery/test/**/*.ts" "packages/@dvt/traceability-service/src/**/*.ts" "packages/@dvt/traceability-service/test/**/*.ts" "packages/@dvt/artifacts/src/**/*.ts" "packages/@dvt/artifacts/test/**/*.ts" "packages/@dvt/adapter-postgres/src/**/*.ts" "packages/@dvt/adapter-postgres/test/**/*.ts" "packages/@dvt/adapter-temporal/src/**/*.ts" "packages/@dvt/engine/src/**/*.ts" "apps/outbox-worker/src/**/*.ts" "apps/outbox-worker/test/**/*.ts" "apps/lineage-worker/src/**/*.ts" "apps/lineage-worker/test/**/*.ts" --ignore-pattern vitest.config.ts --max-warnings 0
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:arc:evidence:check
    - pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md" "docs/planning/closeouts/20260419-rc-g1-c-owner-package-migration-closeout.md" "docs/evidence/ED-20260419-rc-g1-c-owner-package-migration.md"
    - pnpm verify:prepush
---

# ED-20260419 RC-G1-C owner-package migration

## Decision captured

This evidence closes `RC-G1-C`, the owner-package migration slice that removes
the remaining delivery-owned, lineage-owned, and obsolete generic artifact
behavioral surfaces from `@dvt/contracts`.

The slice preserves the frozen `stay shared` vs `move to owner` taxonomy:

1. shared serializable DTOs, refs, envelopes, and shared error contracts stay
   in `@dvt/contracts`;
2. delivery-owned behavioral ports now live in `@dvt/delivery`;
3. lineage-owned runtime and contracts now live in
   `@dvt/traceability-service`;
4. the generic shared-kernel artifact-store abstraction is retired in favor of
   the existing owner-local `@dvt/artifacts` boundary.

## What this evidence proves

1. `@dvt/contracts` no longer exports delivery-owned behavioral ports,
   lineage-owned behavioral ports, or the generic `artifact-store` contract.
2. `@dvt/delivery` is now the canonical import surface for generic outbox
   behavior, including `IOutboxStorage`, `IEventBus`, and worker observer
   contracts.
3. `@dvt/traceability-service` now owns lineage runtime composition,
   lineage-specific outbox storage contracts, and lineage retry policy.
4. `validateArtifactIntegrity` now lives in `@dvt/artifacts`, while
   `ArtifactStoreError` remains shared to preserve the existing cross-context
   error contract.
5. Governed packages fail lint if those owner-local surfaces are reintroduced
   through `@dvt/contracts`.
6. The Lane A tracker, closeout, and active proposal all record `RC-G1-C` as
   complete and leave `RC-G1-D` as the remaining live slice.

## Validation results

- `pnpm --filter @dvt/contracts build`
  - Passed.
- `pnpm --filter @dvt/contracts test`
  - Passed.
- `pnpm --filter @dvt/delivery build`
  - Passed.
- `pnpm --filter @dvt/delivery test`
  - Passed.
- `pnpm --filter @dvt/traceability-service build`
  - Passed.
- `pnpm --filter @dvt/traceability-service test`
  - Passed.
- `pnpm --filter @dvt/artifacts build`
  - Passed.
- `pnpm --filter @dvt/artifacts test`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres build`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres test`
  - Passed.
- `pnpm --filter @dvt/adapter-temporal build`
  - Passed.
- `pnpm --filter @dvt/adapter-temporal test`
  - Passed.
- `pnpm --filter @dvt/engine build`
  - Passed.
- `pnpm --filter @dvt/engine test`
  - Passed.
- `pnpm --filter dvt-outbox-worker typecheck`
  - Passed.
- `pnpm --filter dvt-outbox-worker test`
  - Passed.
- `pnpm --filter dvt-lineage-worker typecheck`
  - Passed.
- `pnpm --filter dvt-lineage-worker test`
  - Passed.
- `pnpm exec eslint "packages/@dvt/contracts/src/**/*.ts" "packages/@dvt/contracts/test/**/*.ts" "packages/@dvt/delivery/src/**/*.ts" "packages/@dvt/delivery/test/**/*.ts" "packages/@dvt/traceability-service/src/**/*.ts" "packages/@dvt/traceability-service/test/**/*.ts" "packages/@dvt/artifacts/src/**/*.ts" "packages/@dvt/artifacts/test/**/*.ts" "packages/@dvt/adapter-postgres/src/**/*.ts" "packages/@dvt/adapter-postgres/test/**/*.ts" "packages/@dvt/adapter-temporal/src/**/*.ts" "packages/@dvt/engine/src/**/*.ts" "apps/outbox-worker/src/**/*.ts" "apps/outbox-worker/test/**/*.ts" "apps/lineage-worker/src/**/*.ts" "apps/lineage-worker/test/**/*.ts" --ignore-pattern vitest.config.ts --max-warnings 0`
  - Passed.
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
  - Executed successfully, but returned `ARC-0` because it inspects
    `origin/main...HEAD` rather than the uncommitted worktree.
  - ARC-2 evidence and the risk update were still added proactively because the
    slice touches governed `@dvt/contracts/**` and `@dvt/adapter-postgres/**`
    paths.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:arc:evidence:check`
  - Passed.
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md" "docs/planning/closeouts/20260419-rc-g1-c-owner-package-migration-closeout.md" "docs/evidence/ED-20260419-rc-g1-c-owner-package-migration.md"`
  - Passed.
- `pnpm verify:prepush`
  - Passed.
  - The changed-only checks inside `verify:prepush` reported no committed diff,
    so the targeted package lint/type/test validation above is the real
    worktree evidence for this uncommitted slice.
