---
title: AR-D4 zero-downtime schema rollback closeout
status: Accepted
owner: Architecture / State Store / Adapter Postgres
date: 2026-05-13
planning_type: closeout
---

# AR-D4 zero-downtime schema rollback closeout

## Governing sources used

`AGENTS.md`, governance inventory, AI work protocol, command/query rail
governance, Fowler planning governance, reference architecture, ADR-0019,
ADR-0031, ADR-0034, ADR-0039, and the AR-D4 proposal.

## Real work performed

- Added rollback compatibility classification and
  `PostgresSchemaRollbackCompatibilityPolicy`.
- Changed `rollbackSchemaTo()` to plan, reject offline-only rollback, and run
  online-compatible rollback without maintenance mode.
- Added Fowler analysis, component guide, user stories, ARC-2 evidence/risk,
  package design updates, and semantic architecture tests.
- Marked AR-D4 `done` in the planning DB.

## Validation evidence

- AR-D4 targeted tests: passed, 3 files / 34 tests.
- `pnpm --filter @dvt/adapter-postgres typecheck`: passed.
- `pnpm --filter @dvt/adapter-postgres test`: passed, 27 files / 163 tests,
  with existing integration suites skipped by config.
- `pnpm docs:feature-mechanization -- --feature AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK`: passed.
- `pnpm docs:feature-mechanization:implementation`: passed after manifest
  symbol alignment.
- `pnpm docs:sync`, `pnpm docs:status:generate`, `pnpm governance:refresh`:
  passed during closeout iterations.

## No-debt evidence

No TODO/FIXME, placeholder, fake adapter, fake success path, hook bypass, or
rule relaxation was added. The risk entry is ARC-2 review evidence for future
classification mistakes, not accepted implementation debt.

## No-stub evidence

The policy is production code, the admin command uses it, and tests validate
behavior plus semantic documentation alignment.
