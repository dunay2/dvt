---
title: PTH2 DVT PostgreSQL connection authority
status: Accepted
date: 2026-08-13
owners:
  - '@dvt/contracts'
  - '@dvt/adapter-postgres'
  - dvt-api
  - dvt-temporal-worker
  - '@dvt/web'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowDesignGraph.v1.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - apps/api/src/application/services/RunExecutionContextBindingUseCase.ts
  - apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx
  - packages/@dvt/adapter-postgres/src/PostgresRelationalExecutionCapability.ts
  - apps/temporal-worker/src/runtime/TemporalWorkerPostgresPlanConnectionResolver.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web test:canvas
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/adapter-postgres test
    - DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@127.0.0.1:5432/dvt pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresPlanConnectionIsolation.integration.test.ts --config vitest.config.ts
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm verify:prepush
---

Issue #2329 establishes one secret-free PostgreSQL `ConnectionRef` as the
authority for a SQL-first DVT plan. The source node owns that reference;
transform and sink nodes inherit it. Graph draft, preview and stored plan retain
the same reference, while `StartRun` resolves its governed credential alias and
writes one immutable `RunExecutionContext.v1` for the worker.

The Temporal worker verifies the context artifact, workspace scope, PlanRef and
step-level reference before resolving credentials. Each admitted binding owns a
separate PostgreSQL pool. Missing, malformed, cross-scope or mismatched bindings
fail before SQL is sent. `DATABASE_URL` is not a fallback for SQL-first DVT
execution; it remains only on the pre-existing object-file loading seam.

The hard cut upgrades the SQL-first transformation profile to v2 without a
compatibility union, migration state or dual read. Generic execution plans
remain at their existing schema version. A real PostgreSQL integration test
creates two independent databases A/B with homonymous `raw.orders` and
`analytics.orders` relations. Each PlanRef mutates only its admitted database;
executing the old A plan after the editable selection moves to B still updates
A and leaves B unchanged. An unadmitted alias cannot open a database session.

The headed browser proof created a new governed project and Warehouse
Connection, imported `raw.orders`, authored Source -> Transform -> Sink,
generated preview `a87244bb21f7957f3044098db1767f337bd87b4cedcf21aad7f764565435d9ea`
and completed run `run_019ffe42-d90d-785f-943f-7057809e9b37` with three rows
written to `public.pth2_orders`. Its immutable run context retained
`postgresql-local-gobernado` and `postgres:local-postgres-proof`.

No stub, placeholder, migration layer, duplicate command/query rail or secret
was added to graph, plan or run-context persistence.
