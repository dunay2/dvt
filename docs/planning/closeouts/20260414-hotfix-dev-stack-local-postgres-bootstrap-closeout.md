---
slice: hotfix-dev-stack-local-postgres-bootstrap
date: 2026-04-14
lane: C
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: Dev stack local Postgres bootstrap hotfix

## Think-First Analysis

### Problem summary

`pnpm dev:app` starts the API and web shell together, but it does not provide a
database posture for the API. In local development that leaves `/readyz`
degraded with `database_not_configured`, which the frontend correctly renders as
`Backend degraded`.

### Root cause

`scripts/run-dev-stack.cjs` coordinated process startup only. It enabled
`DVT_READYZ_ENABLED=true`, but it neither provisioned local Postgres nor set
`DATABASE_URL` for the API process.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, real validation, no
  skipped hooks.
- `docs/guides/ai-work-protocol.md`: workflow-affecting changes still require
  think-first analysis, validation, and closeout.
- `scripts/run-temporal-postgres-proof.cjs`: canonical local Docker Postgres
  bootstrap wrapper for this repository.
- `apps/api/src/plugins/env.ts`: `DATABASE_URL` is optional at process level but
  required for a non-degraded database readiness posture.
- `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`: `/readyz`
  should reflect real runtime dependency posture instead of being masked.

### Selected option and rationale

Teach `run-dev-stack.cjs` to bootstrap the canonical local Docker Postgres
proof environment only when `DATABASE_URL` is absent, then inject that DSN into
the API process and wait for `/db/ready`.

This fixes the root cause without overriding explicit operator configuration and
without hiding readiness failures behind fake green status.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `scripts/run-dev-stack.cjs`
  - `scripts/run-dev-stack.test.cjs`
  - `scripts/README.md`
  - `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`
- Expected outcome:
  - `pnpm dev:app` starts local Postgres automatically when no `DATABASE_URL`
    is set
  - the API process receives a canonical local `DATABASE_URL`
  - the coordinated startup waits for `/db/ready`, not only `/healthz`
  - operators can opt out with an explicit flag
- Risks and mitigations:
  - Risk: script hijacks explicitly configured database posture
  - Mitigation: bootstrap only when `DATABASE_URL` is absent
  - Risk: local Docker startup hides readiness failures
  - Mitigation: wait on `/db/ready` and fail the coordinated startup if the DB
    probe never becomes healthy
- Out of scope:
  - automatic OIDC posture for protected runtime routes
  - changing `/readyz` semantics
  - shutting down Docker Postgres automatically when the stack exits

## Implementation Summary

- Added local-Postgres bootstrap policy to `scripts/run-dev-stack.cjs`.
- Added an explicit `--skip-postgres` escape hatch for operators who want to
  supply database posture themselves.
- Injected `DATABASE_URL` plus `DVT_DB_READY_ENABLED=true` into the API process
  when local bootstrap is used.
- Added `scripts/run-dev-stack.test.cjs` for argument parsing and environment
  resolution seams.
- Updated `scripts/README.md` and the backend MVP runbook to document the new
  local behavior.

## Validation Run

- `pnpm exec eslint --max-warnings 0 scripts/run-dev-stack.cjs scripts/run-dev-stack.test.cjs` - PASS
- `node --test scripts/run-dev-stack.test.cjs` - PASS
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260414-hotfix-dev-stack-local-postgres-bootstrap-closeout.md docs/runbooks/backend-mvp-control-plane-runbook-20260329.md scripts/README.md --config .markdownlint-cli2.jsonc` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:gov:links:changed` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- If local OIDC/runtime adapter posture is still incomplete, `/readyz` can
  remain degraded for reasons other than the database. This hotfix removes the
  missing-database failure mode only.
