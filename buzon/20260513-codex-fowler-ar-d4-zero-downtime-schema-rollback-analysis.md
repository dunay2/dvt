---
title: Fowler Analysis AR-D4 Zero-Downtime Schema Rollback
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-13
planning_type: analysis
---

# Fowler architecture analysis - AR-D4

## Fowler reading

AR-D4 moves rollback availability from a primitive active-client conditional to
an explicit policy object beside the migration catalog. That matches Fowler's
Encapsulate Policy and keeps the adapter facade as the service layer for
concrete Postgres administration.

## Mature-system comparison

Mature SaaS systems use expand-contract schema changes: additive or policy-only
steps stay online, while destructive contraction is rejected or scheduled as an
offline operation. DVT already had compatible rollback functions; the drift was
that every rollback still entered maintenance mode.

## Improved patterns

- Rollback plans now publish online/offline compatibility per step.
- The advisory schema lifecycle lock remains in the schema manager.
- Tenant RLS hardening rollback reapplies current policy instead of downgrading.

## Antipatterns detected

- Primitive obsession: `hasActiveClients()` was the rollback safety model.
- Hidden authority: the admin facade decided outage posture without step facts.
- Documentation drift: package design named rollback but not availability.

## Repetitions and drift

The repeated phrase is now: online-compatible rollback plans run without
maintenance mode; destructive plans fail closed with
`SCHEMA_ROLLBACK_REQUIRES_OFFLINE_COMPATIBILITY`.

## Grouping opportunities

`PostgresSchemaManager` owns migration catalog and compatibility classification.
`PostgresStateStoreAdminAdapter` owns the concrete command/query surface.

## Future teachings

Every new migration step must classify rollback compatibility when introduced.
Backward-compatible rollback means classified and proven, not "all rollback is
safe".
