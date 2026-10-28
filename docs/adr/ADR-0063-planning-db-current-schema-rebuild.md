---
title: ADR-0063 - Planning DB current-schema rebuild
status: Accepted
date: 2026-08-08
owners:
  - architecture
  - governance
  - planning-db
arc_level: ARC-1
---

# ADR-0063 - Planning DB Current-Schema Rebuild

## Status

Accepted.

## Context

Planning DB is a repository-governance query store. Git and repository-derived
inputs reconstruct imported projections; DB-authored architecture and
mechanization rows remain authoritative in Planning DB. Planning DB does not
serve product runtime data and has no supported rolling-upgrade or
historical-database compatibility contract.

The existing implementation nevertheless applies hundreds of ordered SQL
files, records their versions and checksums in `schema_migrations`, and rejects
changes to previously applied files. Many of those files also encode
intermediate feature, design, status, and evidence mutations. This makes every
historical delivery step part of the current bootstrap contract and creates a
second history authority beside Git.

## Decision

Planning DB uses one declarative current schema for empty-database bootstrap
and a separate deterministic import path for repository-owned projections.

The bootstrap path MUST:

1. apply the one current schema definition only to an empty or explicitly reset
   Planning DB;
2. fail closed rather than upgrade or reconcile an older schema; and
3. leave routine imports unable to replace the schema.

The import path MUST refresh repository-derived projections in place, preserve
DB-authored architecture, mechanization, overlays, and audit rows, fail closed
without publishing a partial import, and produce equivalent query results for
identical repository inputs.

Planning DB MUST NOT contain or expose:

- a migration directory or ordered migration files;
- a migration runner or migration command;
- an applied-migration table, version, checksum, or ordinal;
- compatibility logic for an older Planning DB instance; or
- an implicit destructive rebuild during import, query, refresh, or closeout.

### Explicit additions to the current schema

An operator may add a previously absent table through `ApplyCurrentPlanningDbSchema`
with an explicit table identity and the SHA-256 of the reviewed current schema.
The command reads the complete table definition from `tools/planning-db/schema.sql`;
it accepts no alternative SQL file or caller-supplied DDL. The addition must be
self-contained, including its constraints. Existing objects, data and definitions
remain untouched. Existing tables, missing dependencies, external table clauses,
unknown identities and a mismatched schema digest reject the operation.

The operation is transactional, takes the same schema lock as bootstrap, and is
never invoked by queries, imports, governance refresh or validation. It records
no applied-version ledger and supports no chain of older schemas. This narrow
addition path preserves DB-authored authority while the current model gains a
new relation. Changes to existing objects still require a separately governed
decision; automatic schema reconciliation remains unsupported.

The accepted GH-3699 scope uses this path for current component-to-source
responsibility associations. Acceptance requires a real PostgreSQL test proving
rollback, foreign-key enforcement, rejection of existing tables and preservation
of unrelated architecture rows.

### Explicit replacement of documentation read projections

The separate [GH-3747 decision](https://github.com/dunay2/dvt/issues/3747#issuecomment-6476202219)
permits a bounded extension of `ApplyCurrentPlanningDbSchema` to reconcile
consolidated component-guide references. This is an explicit operator action;
the implementation contract must be satisfied before it is applied.

The mode may replace only
`planning_query_store.command_query_rail_manifest_query` and
`planning_query_store.documentation_lifecycle_query`. It reads their definitions
from the reviewed current `tools/planning-db/schema.sql`, requires that file's
SHA-256 and both live `pg_get_viewdef` hashes, and checks them under the same
current-schema advisory lock and transaction before replacement.

The existing 27 manifest columns and 26 lifecycle columns retain their names,
types and order. The only admitted additions are final
`effective_component_guides jsonb` and `canonical_target_path text`, respectively.
Imported declarations and their raw manifests remain historical facts; the
effective projection identifies the current consultation target.

The operation must reject absent or unexpected views, stale hashes, unsupported
arguments and any other signature change. Both replacements roll back together
on failure. It accepts no caller-supplied SQL, path or object identity, never
reaches schema reset or table addition, and alters no table or stored row.
Queries, imports, refreshes and checks must not invoke it automatically. It
introduces no migration chain, applied-version ledger or older-schema
compatibility path. Isolated PostgreSQL tests must prove rollback, exact
column preservation and preservation of unrelated definitions and data.

Git remains the history and review boundary for repository-owned inputs.
`ImportPlanningGovernanceQueryStore` owns their projection into Planning DB.
DB-authored architecture and mechanization are read through governed queries;
derived publication is available only through the explicitly requested
`PublishPlanningDbDerivedProjections` rail. The migration-policy rail is
retired and replaced by a current-schema fitness rule that rejects migration
artifacts.

Archived and superseded documents remain historical evidence only. Current
command/query rail discovery and implementation evidence MUST exclude them so
that a retired delivery record cannot create or satisfy a current rail.

This decision applies only to Planning DB. Product runtime databases,
`infra/db/migrations/**`, and `@dvt/adapter-postgres` schema management remain
outside its boundary.

## Consequences

Positive:

- current governance truth no longer depends on intermediate delivery states;
- there is one schema owner and one empty-database bootstrap path;
- obsolete schema and state disappear when the current definition changes;
- bootstrap cost and review surface no longer grow with repository history;
- Git records repository-owned history while Planning DB audit rows record
  operated architecture and mechanization history.

Costs:

- every Planning DB schema change edits the current schema in place;
- an operator-confirmed reset intentionally discards DB-authored state and is
  not a routine recovery mechanism;
- schema and import must be validated together against a real PostgreSQL
  instance;
- active documents, policies, tests, and generated state must not refer to
  removed migration paths.

## Rejected Alternatives

### Keep schema-only migrations

Rejected because ordered identities and applied-state compatibility still make
historical transitions part of the current contract.

### Squash migrations into one baseline migration

Rejected because a baseline migration, migration command, or one-row ledger
preserves the same incorrect lifecycle model under a smaller file count.

### Preserve local rows through a compatibility rebuild

Rejected because copying rows across incompatible schemas would introduce
compatibility semantics. Routine imports preserve DB-authored rows by not
rebuilding the schema; an explicit reset starts an empty database.

### Use a second state snapshot format

Rejected because it creates another owner. The declarative current SQL schema
is the only schema definition, and Planning DB remains the sole authority for
DB-authored architecture and mechanization state.

## Validation

- repository fitness test rejects Planning DB migration artifacts;
- schema bootstrap tests prove empty-database initialization and fail-closed
  handling of incompatible schemas;
- real PostgreSQL integration proves repeated imports preserve DB-authored
  architecture, mechanization, overlays, and audit rows;
- import and query run twice with equivalent repository projections and zero
  second-run repository diff;
- Planning DB, documentation, governance refresh, and pre-push gates pass.

## Related Decisions

- [ADR-0061](./ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
- [ADR-0055](./adr-0055-planning-db-canonical-operational-source.md)
