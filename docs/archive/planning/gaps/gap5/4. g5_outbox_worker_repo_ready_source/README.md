---
title: G5 Outbox Worker Repo-Ready Package
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# G5 Outbox Worker Repo-Ready Package

This ZIP contains a **repo-ready package skeleton** for `packages/@dvt/outbox-worker`.
It implements the final focused baseline already accepted for G5:

- independent worker runtime,
- host / runtime / engine split,
- polling-first runtime,
- subscriber outcomes as typed results,
- crash-window test seam,
- backoff separated from delivery decision,
- `outbox record` and `sideEffectKind` canonical naming,
- production-safe secret boundary (host resolves, core does not),
- metrics and test scaffolding,
- optional wake-up signal abstraction,
- no new branded types in this package.

## What is included

- `packages/@dvt/outbox-worker/` source package
- `tests/` unit and integration-oriented tests
- `docs/sql/postgres_claim_reference.sql` reference SQL for polling claim and lane lease shape
- `INTEGRATION_NOTES.md` for wiring into the wider repo

## What is intentionally not included

This package does **not** ship a production Postgres adapter.
That belongs in `@dvt/adapter-postgres` or equivalent.
This package defines the contracts, orchestration core, runtime loop, host boundary, and test adapters.

## Expected workspace placement

Copy the `packages/@dvt/outbox-worker` directory into the monorepo and add the package to the workspace.
