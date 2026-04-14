---
title: Accept the first PostgreSQL execution-first runtime vertical
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/adapter-postgres
  - apps/api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/vitest.config.ts
  - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - scripts/run-temporal-postgres-proof.cjs
  - docs/runbooks/temporal-postgres-proof-environment.md
  - docs/planning/state/agent-lane-c.yaml
  - docs/planning/closeouts/20260413-tf-c2-runtime-vertical-acceptance-closeout.md
evidence:
  tests:
    - pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/vitest.config.ts scripts/run-temporal-postgres-proof.cjs
    - pnpm test:adapter-temporal:integration:postgres:docker
    - pnpm docs:gov:links:changed
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - ARC_JSON=arc.json node tools/ci/doc-check.mjs
    - pnpm verify:prepush
---

## Summary

`TF-C2` is now accepted as the first execution-first runtime vertical for the
SQL transformation product loop.

The acceptance claim is narrow and explicit:

1. a persisted `PlanRef` can execute through the PostgreSQL runtime seam;
2. the canonical local Docker proof environment exists and is runnable through
   one governed wrapper; and
3. caller-visible runtime read surfaces expose materialization evidence and
   failure diagnostics.

The acceptance artifact also closes two proof-path assumptions found during the
parent validation pass:

1. the Temporal Postgres capability lane now resolves the built
   `@dvt/adapter-postgres` entry explicitly instead of depending on a workspace
   package symlink already existing in the local install state; and
2. the canonical wrapper now supports both `docker compose` and
   `docker-compose`.

## What this acceptance closes

1. Parent-level closure for the PostgreSQL executor path already delivered in
   `TF-C2-A`.
2. Parent-level closure for the caller-visible result evidence path already
   delivered in `TF-C2-B`.
3. The planning drift where runtime truth was shipped but the parent task still
   read as if the first vertical were not yet accepted.
4. Local proof-path compatibility drift between the documented wrapper and the
   real Windows or Docker Desktop environment.

## What this acceptance does not close

1. `TF-D1` repeatable reset, cleanup, and retention discipline for proof runs.
2. `TF-C1` preview-persist convergence that still sits upstream of the broader
   product loop.
3. `TF-C3` phase-2 dbt executor mode.
4. `WE-HX` runtime boundary and ownership hardening outside this specific
   PostgreSQL vertical.
