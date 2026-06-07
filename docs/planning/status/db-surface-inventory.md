---
title: DB Surface Inventory
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-06-05
planning_type: status
---

# DB Surface Inventory

This tracked document is a stable navigation pointer. The authoritative DB
surface inventory is stored in Planning DB rows and read through
`planning_query_store.db_governance_surface_query`; the full Markdown reading
surface is generated locally under
`.generated-docs/planning/status/generated-db-surface-inventory.md`.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`
- `docs/architecture/command-query-rail-governance.md`
- `tools/planning-db/migrations/059_db_surface_inventory.sql`
- `scripts/planning-db-operate.cjs`
- `scripts/planning-db-query.cjs`
- `scripts/generate-db-surface-inventory.cjs`
- `docs/generated-docs-policy.json`

## Command And Query Rails

- Command rail: `UpsertDbGovernanceSurface`
  - Application port: `pnpm planning:db:operate db-surface upsert`
  - Adapter surface: `scripts/planning-db-operate.cjs`
  - DB tables:
    `planning_query_store.db_governance_surfaces`,
    `planning_query_store.db_governance_surface_operations`
  - Negative tests: invalid migration state, invalid write rail kind,
    DB-first surface without `db_command`, idempotency mismatch, and stale
    source hash reuse
- Query rail: `ReadDbGovernanceSurface`
  - Application port: `pnpm planning:db:query db-surfaces`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - DB view: `planning_query_store.db_governance_surface_query`
  - Negative tests: unknown query rejection and real predicates for
    `--surface`, `--state`, `--kind`, and `--limit`
- Generated reading surface: `GenerateDbSurfaceInventory`
  - Application port: `pnpm docs:db-surface-inventory:generate`
  - Check port: `pnpm docs:db-surface-inventory:check`
  - Adapter surface: `scripts/generate-db-surface-inventory.cjs`

## Operator Commands

```bash
pnpm planning:db:migrate
pnpm planning:db:query db-surfaces --limit 30
pnpm planning:db:inventory:check
pnpm docs:db-surface-inventory:generate
pnpm docs:db-surface-inventory:check
```

## Manual Edit Policy

Do not edit a surface table in this file. To change surface state, use
`pnpm planning:db:operate db-surface upsert ...` so the DB row, source hash,
revision, and operation audit remain aligned. Then regenerate the local render
with `pnpm docs:db-surface-inventory:generate`.
