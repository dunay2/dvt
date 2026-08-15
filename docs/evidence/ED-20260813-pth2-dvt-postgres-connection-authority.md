---
title: PTH2 DVT PostgreSQL connection authority
status: Accepted
date: 2026-08-13
owners:
  - '@dvt/contracts'
  - '@dvt/adapter-postgres'
  - '@dvt/artifacts'
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
  - packages/@dvt/artifacts/src/runtime/S3RunExecutionContextReferenceStore.ts
  - apps/api/src/infrastructure/dbt/ArtifactBackedRunExecutionContextReferenceReader.ts
  - apps/api/src/infrastructure/dbt/ArtifactBackedRunExecutionContextInheritanceWriter.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/artifacts typecheck
    - pnpm --filter @dvt/web test:canvas
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresPlanConnectionIsolation.test.ts test/PostgresTransformationStepActivities.test.ts --config vitest.config.ts
    - DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@127.0.0.1:5432/dvt pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresPlanConnectionIsolation.integration.test.ts --config vitest.config.ts
    - pnpm --filter @dvt/adapter-postgres typecheck
    - DVT_PG_URL=postgresql://dvt:dvt@127.0.0.1:5432/dvt pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.postgres.time-skipping.test.ts --config vitest.config.ts
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
fail before SQL is sent. The relational capability also rejects SQL-first steps
when no plan connection resolver was composed, so its object-file pool cannot
become an implicit execution fallback. `DATABASE_URL` is not a fallback for
SQL-first DVT execution; it remains only on the pre-existing object-file loading
seam.

The hard cut upgrades the SQL-first transformation profile to v2 without a
compatibility union, migration state or dual read. Generic execution plans
remain at their existing schema version. A real PostgreSQL integration test
creates two independent databases A/B with homonymous `raw.orders` and
`analytics.orders` relations. Each PlanRef mutates only its admitted database;
executing the old A plan after the editable selection moves to B still updates
A and leaves B unchanged. An unadmitted alias cannot open a database session.
The Temporal adapter integration fixture now supplies the same complete v2 step
configs and an explicit plan resolver; its real PostgreSQL workflow reaches
`RunCompleted` through all three steps.

For the supported S3 artifact backend, the context payload remains
content-addressed while `@dvt/artifacts` persists a separate immutable
run-to-reference index. Tenant and run identifiers are SHA-256 addressed in
that index, conditional S3 writes reject conflicting rebinds, and only an
identical replay is accepted. Status and `RecoverRun` now load the same trusted
reference through the artifact-backed reader; recovery verifies the source
payload and records the descendant run identity against the same immutable S3
context. Missing, malformed, cross-tenant or conflicting references fail
closed.

The headed browser proof created a new governed project and Warehouse
Connection, imported `raw.orders`, authored Source -> Transform -> Sink,
generated preview `a87244bb21f7957f3044098db1767f337bd87b4cedcf21aad7f764565435d9ea`
and completed run `run_019ffe42-d90d-785f-943f-7057809e9b37` with three rows
written to `public.pth2_orders`. Its immutable run context retained
`postgresql-local-gobernado` and `postgres:local-postgres-proof`.

No stub, placeholder, database migration layer, duplicate command/query rail
or secret was added to graph, plan or run-context persistence.
