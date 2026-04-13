---
title: Temporal Postgres Proof Environment
status: Active
owner: Runtime / Delivery / Docs
last_reviewed: 2026-04-13
---

# Temporal Postgres Proof Environment

This is the canonical local proof surface for the `TF-C2-A` PostgreSQL
capability lane in `@dvt/adapter-temporal`.

It exists to stop the local acceptance flow from being scattered across CI
workflow snippets, evidence docs, and ad-hoc shell commands.

## Canonical Commands

Start or reuse the local Docker PostgreSQL environment:

```bash
pnpm proof:temporal:postgres:up
```

Reset the environment to a clean local baseline:

```bash
pnpm proof:temporal:postgres:reset
```

Run the full Temporal Postgres capability proof against the Docker environment:

```bash
pnpm test:adapter-temporal:integration:postgres:docker
```

Tear the environment down and remove the Docker volume:

```bash
pnpm proof:temporal:postgres:down
```

## What the Wrapper Does

`pnpm test:adapter-temporal:integration:postgres:docker`:

1. resets the Docker PostgreSQL environment;
2. starts `infra/docker/postgres/docker-compose.yml`;
3. waits for the `dvt-postgres` container to become healthy;
4. exports the canonical local DSN as both `DATABASE_URL` and `DVT_PG_URL`;
5. enables `DVT_PG_INTEGRATION=1`;
6. runs the package-local Postgres capability lane in
   `@dvt/adapter-temporal`.

Default DSN:

```text
postgresql://dvt:dvt@localhost:5432/dvt
```

If you already have a different local DSN, set `DVT_PG_URL` or `DATABASE_URL`
before invoking the command and the wrapper will reuse it.

The wrapper prefers `docker compose` when the Docker CLI exposes the Compose v2
subcommand and falls back to `docker-compose` when only the standalone Compose
binary is available.

## Primary Anchors

- Compose file:
  [infra/docker/postgres/docker-compose.yml](../../infra/docker/postgres/docker-compose.yml)
- Temporal adapter scripts:
  [packages/@dvt/adapter-temporal/package.json](../../packages/@dvt/adapter-temporal/package.json)
- Root command registry:
  [package.json](../../package.json)
- Wrapper implementation:
  [scripts/run-temporal-postgres-proof.cjs](../../scripts/run-temporal-postgres-proof.cjs)

## Failure Signals

- If Docker is unavailable, the wrapper fails immediately from the `docker`
  command.
- If the container does not become healthy in time, the wrapper fails with a
  timeout for `dvt-postgres`.
- If the Temporal Postgres capability test fails, the wrapper returns the
  failing test exit code without hiding it.

## Related Docs

- [Testing and CI Capabilities](../guides/testing-and-ci-capabilities.md)
- [Infrastructure Architecture](../architecture/infra/index.md)
- [Temporal Engine Policies](../architecture/components/engine/adapters/temporal/EnginePolicies.md)
