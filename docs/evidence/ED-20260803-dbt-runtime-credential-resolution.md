---
title: Runtime-only DBT credential resolution and authorization audit
status: Accepted
date: 2026-08-03
owners:
  - packages/@dvt/contracts
  - packages/@dvt/temporal-dbt-plugin
  - apps/temporal-worker
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts
  - packages/@dvt/temporal-dbt-plugin/src/dbtRuntimeProfile.ts
  - packages/@dvt/temporal-dbt-plugin/src/DbtCliPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts
  - apps/temporal-worker/src/runtime/EnvironmentDbtRuntimeProfileResolver.ts
  - apps/api/src/infrastructure/audit/PostgresAuthAuditAdapter.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/temporal-dbt-plugin test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/temporal-dbt-plugin typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-api typecheck
    - DATABASE_URL=postgres://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/audit/PostgresAuthAuditAdapter.test.ts
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts
---

## Decision

The server-owned DBT execution target contributes only an opaque
`credentialRef` to the immutable run execution context. Contract validation
rejects connection strings and URI-shaped credential values before the context
can cross the planning or admission boundary.

The Temporal worker owns the first concrete resolution adapter. It accepts the
deployment reference form `env:NAME`, reads the configured DBT profile only
inside worker execution, and gives the plugin bytes rather than a reusable
application credential object. The plugin writes one restrictive temporary
`profiles.yml`, passes only its directory to DBT, clears the source bytes, and
removes profile and project material after success, failure, timeout, or
cancellation. Activity cancellation is connected to the DBT subprocess through
`AbortSignal` and is rethrown only after cleanup. The workflow waits for step
activity cancellation to complete, so `RunCancelled` cannot be emitted before
the worker has terminated the subprocess and removed the credential material.

The existing `IAuthAuditPort` remains the sole authorization-audit boundary.
One composite writes each allow or deny decision first to PostgreSQL append-only
storage and then to the operational structured logger. The durable adapter
accepts only contract fields, derives an idempotent event identity, scopes
inserts and reads with forced RLS, and rejects committed-row updates or deletes.

## Evidence

Focused contract tests reject plaintext credential values and prove the exact
authorized reference is stored. Runtime tests prove unavailable references fail
before process invocation, returned failures do not contain process output, the
temporary file has restrictive permissions, and a real cancelled subprocess is
terminated before both temporary directories are removed.

PostgreSQL-backed tests prove one record per decision identity, cross-tenant
read isolation, and append-only mutation rejection. The selected-closure live
proof runs a real dbt-postgres command through the protected API, Temporal
worker, PostgreSQL, and Cypress flow.
