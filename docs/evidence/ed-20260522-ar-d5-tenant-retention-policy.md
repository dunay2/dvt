---
title: Tenant configurable run-event retention policy
status: Accepted
date: 2026-05-22
owners:
  - dvt/state-store
  - dvt/adapter-postgres
  - dvt-outbox-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunArchiveStore.ts
  - apps/outbox-worker/src/runtime/buildRunEventRetentionRuntime.ts
evidence:
  tests:
    - pnpm --filter @dvt/state-store test -- RunEventRetentionPolicy.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresRunArchiveStore.tenant-retention.test.ts PostgresRunArchiveStore.tenant-retention.integration.test.ts
    - pnpm --filter dvt-outbox-worker test -- test/plugins/env.test.ts test/runtime/createOutboxWorkerRuntime.test.ts
    - pnpm --filter @dvt/state-store typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter dvt-outbox-worker typecheck
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm docs:status:generate
    - pnpm governance:refresh
    - pnpm verify:prepush
---

This evidence record covers AR-D5 tenant-configurable run-event hot-retention
policy and the `ConfigureRunEventRetentionPolicy` command rail. The slice keeps
ADR-0037 archive-unit identity unchanged and adds tenant-specific retention
resolution before Postgres archive eligibility.

The adapter does not partially export tenant subsets from a shared archive unit.
A shared unit becomes eligible only when every tenant represented in the unit
satisfies its own resolved retention window and every run is terminal.
