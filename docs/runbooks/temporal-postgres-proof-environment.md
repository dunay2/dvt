---
title: Local PostgreSQL development environment
status: Active
last_reviewed: 2026-09-03
owner: Runtime Platform
---

# Local PostgreSQL development environment

This runbook governs the PostgreSQL container used by the local application and
browser proofs. It does not provide a Temporal SQL-first execution proof: that
runtime family was retired by the VTX2 hard cut.

## Commands

Start or reuse the seeded container:

```bash
pnpm postgres:local:up
```

Recreate the volume and verify the canonical `core`, `eventstore`, and `public`
schemas:

```bash
pnpm postgres:local:reset
```

Stop the stack and remove its volume:

```bash
pnpm postgres:local:down
```

The implementation is
[`scripts/run-local-postgres.cjs`](../../scripts/run-local-postgres.cjs). It uses
`infra/docker/postgres/docker-compose.yml`, prefers Docker Compose v2, falls back
to the standalone `docker-compose` binary, and waits for the `dvt-postgres`
health check.

## Current PostgreSQL guarantees

- Adapter role and RLS behavior:
  `pnpm --filter @dvt/adapter-postgres test -- PostgresAppRoleRuntime.integration.test.ts PostgresTenantRlsEnforcement.integration.test.ts`
- Object-file load contract: `pnpm --filter @dvt/contracts test -- object-file-to-postgres-step.contract.test.ts`
- Object-file worker behavior:
  `pnpm --filter dvt-temporal-worker test -- temporalWorkerObjectFilePostgresProfile.test.ts`
- The PR quality job `PostgreSQL adapters and object-file integration` runs the
  service-backed RLS and object-file vertical.

## Safety

`postgres:local:reset` and `postgres:local:down` remove only the volume declared
by the repository Compose project. Use them only for this local development
database. Neither command targets an externally configured database URL.
