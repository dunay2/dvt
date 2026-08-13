---
title: Canonical run lifecycle rail hard-cut
status: Accepted
date: 2026-08-13
owners:
  - apps/api
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: true
code_refs:
  - apps/api/src/entrypoints/http/protectedRuntimeRunRoutes.ts
  - packages/@dvt/contracts/src/contracts/engine/RunControlBoundary.v1.ts
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api test:integration:ci
    - DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test -- PostgresStartRunIntentStore.test.ts
    - DVT_PG_URL=<postgres> TEMPORAL_ADDRESS=<temporal> pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/protectedRuntime.integration.test.ts
    - pnpm verify:prepush
---

Issue #2169 now reaches the seven existing protected run routes through their
canonical command/query rails. Cancellation is an engine command, recovery
eligibility is owned by the engine, PAUSE and RESUME remain the only signal
vocabulary, scoped list filtering precedes limits, and public control payloads
are parsed by the shared contract.

The duplicate API run-control coordinator, start facade, local receipt parser
and generic cancellation signal were removed. Real PostgreSQL and Temporal
integration proves Start, List, Get, Events, Signal, Cancel and Recover without
compatibility fallbacks or a second authority path.
