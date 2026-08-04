---
title: Execute bounded object-file loads through the PostgreSQL Temporal plugin
status: Accepted
date: 2026-08-04
owners:
  - packages/@dvt/temporal-object-file-postgres-plugin
  - packages/@dvt/adapter-postgres
  - packages/@dvt/artifacts
  - apps/temporal-worker
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/temporal-object-file-postgres-plugin/src/ObjectFilePostgresPluginRunner.ts
  - packages/@dvt/temporal-object-file-postgres-plugin/src/objectFileRows.ts
  - packages/@dvt/adapter-postgres/src/PostgresObjectFileLoader.ts
  - packages/@dvt/artifacts/src/runtime/readArtifactBytes.ts
  - apps/temporal-worker/src/runtime/temporalWorkerObjectFilePostgresProfile.ts
  - apps/temporal-worker/test/host/objectFilePostgres.service.integration.test.ts
  - .github/workflows/pr-quality-gate.yml
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/temporal-object-file-postgres-plugin test
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/artifacts typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter @dvt/temporal-object-file-postgres-plugin typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

## Decision

Issue 2179 is implemented through one statically composed and typed
`TemporalStepPluginProfile`. The profile owns only
`LOAD_OBJECT_FILE_TO_POSTGRES` and reuses the existing Temporal workflow,
artifact reader, PostgreSQL capability, step registry, and `StartRun` command
rail. It does not introduce another workflow, executor, plugin loader, or
parallel command surface.

The runtime reads the content-addressed object through opaque credentials,
verifies media type, size, and SHA-256 before parsing, maps bounded CSV or JSON
Lines rows through the admitted contract, and replaces only a validated
PostgreSQL staging relation in one transaction. The receipt records verified
source evidence and whether the target was created or replaced.

## Failure semantics

Contract, identity, scope, encoding, mapping, and content failures are
permanent. Provider and database availability failures are sanitized and
retryable without exposing object payloads, credentials, or provider causes.
Cancellation propagates through object reads and PostgreSQL batches. A failed
parse or load leaves no partial target state, and a retry remains idempotent.

## Runtime proof

The service test uses real MinIO, Temporal Server, and PostgreSQL instances. It
executes the admitted plan twice through the production worker composition,
proves the first publication is `created`, the retry publication is
`replaced`, and verifies the final relation contains exactly the expected rows
without duplication. Focused tests additionally cover CSV and JSON Lines,
digest/size/media mismatches, unavailable objects, invalid bindings and scope,
unsafe numeric values, rollback, cancellation, duplicate step registration,
readiness projection, and DBT/PostgreSQL profile composition.

## Residual boundary

Payloads remain deliberately bounded and parsed in memory. The hard size limit
prevents unbounded worker pressure; streaming is not added pre-emptively and is
tracked as a capacity risk rather than hidden implementation debt.
