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

Remove transient proof schemas while keeping the Docker container and volume:

```bash
pnpm proof:temporal:postgres:cleanup
```

Run the full Temporal Postgres capability proof against the Docker environment:

```bash
pnpm test:adapter-temporal:integration:postgres:docker
```

Run the same proof against an already running environment without destroying
the Docker volume first:

```bash
pnpm proof:temporal:postgres:test
```

Tear the environment down and remove the Docker volume:

```bash
pnpm proof:temporal:postgres:down
```

## Lifecycle Policy

- `up` means start or reuse the canonical Docker PostgreSQL container.
- `reset` means destroy the Docker volume, recreate it, rerun the init SQL, and
  verify the seeded baseline.
- `cleanup` means keep the container warm but drop transient proof schemas left
  by the runtime proof and adapter integration lanes.
- `down` means stop the environment and remove the Docker volume.

The seeded baseline after `reset` is:

- schemas: `public`, `core`, and `eventstore`
- bootstrap table: `core.health_check`
- no transient proof schemas

Transient proof schemas are disposable by policy. The canonical cleanup path
removes only the proof-owned transient prefixes:

- `it_runtime_*`
- `dvt_transform_it_*`

If you want a fully cold baseline, use `reset`. If you want to rerun the proof
without paying a full Docker volume recreation, use `cleanup` between runs.

## What the Wrapper Does

`pnpm test:adapter-temporal:integration:postgres:docker`:

1. resets the Docker PostgreSQL environment;
2. starts `infra/docker/postgres/docker-compose.yml`;
3. waits for the `dvt-postgres` container to become healthy;
4. exports the canonical local DSN as both `DATABASE_URL` and `DVT_PG_URL`;
5. enables `DVT_PG_INTEGRATION=1`;
6. verifies the seeded baseline before the proof run starts; and
7. runs the package-local Postgres capability lane in
   `@dvt/adapter-temporal`.

Default DSN:

```text
postgresql://dvt:dvt@localhost:5432/dvt
```

The wrapper always targets the canonical local Docker DSN above. If you need to
run the adapter integration lane against a different local PostgreSQL DSN, call
the package-local command directly instead of this wrapper.

The wrapper prefers `docker compose` when the Docker CLI exposes the Compose v2
subcommand and falls back to `docker-compose` when only the standalone Compose
binary is available.

## Canonical Repeatability Flow

For a full cold rerun:

```bash
pnpm proof:temporal:postgres:reset
pnpm test:adapter-temporal:integration:postgres:docker
pnpm proof:temporal:postgres:down
```

For consecutive warm reruns on the same local container:

```bash
pnpm proof:temporal:postgres:test
pnpm proof:temporal:postgres:cleanup
pnpm proof:temporal:postgres:test
```

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
- If Docker Compose cannot tear the environment down, `down` and any reset path
  that depends on teardown fail immediately instead of reporting a false clean
  baseline.
- If `reset` cannot restore the seeded baseline, the wrapper fails before the
  Postgres proof test starts.
- If `cleanup` cannot remove all transient proof schemas, the wrapper fails and
  reports the leftover schema names.
- If the Temporal Postgres capability test fails, the wrapper returns the
  failing test exit code without hiding it.

## Related Docs

- [Testing and CI Capabilities](../guides/testing-and-ci-capabilities.md)
- [Infrastructure Architecture](../architecture/infra/index.md)
- [Temporal Engine Policies](../architecture/components/engine/adapters/temporal/EnginePolicies.md)
