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

Planning DB uses one declarative current schema and a destructive,
deterministic rebuild/import path.

The rebuild path MUST:

1. replace the complete `planning_query_store` schema;
2. apply the one current schema definition;
3. import repository-derived projections without replacing DB-authored
   architecture or mechanization authority;
4. fail closed without publishing a partial schema or partial import; and
5. produce equivalent query and export results for identical repository inputs.

Planning DB MUST NOT contain or expose:

- a migration directory or ordered migration files;
- a migration runner or migration command;
- an applied-migration table, version, checksum, or ordinal;
- compatibility logic for an older Planning DB instance; or
- preservation of local database rows across a rebuild.

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
- there is one schema owner and one recovery path;
- obsolete schema and state disappear when the current definition changes;
- bootstrap cost and review surface no longer grow with repository history;
- Git provides the only historical record.

Costs:

- every Planning DB schema change edits the current schema in place;
- existing local Planning DB contents are intentionally discarded on rebuild;
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

### Preserve local rows during rebuild

Rejected because it introduces compatibility semantics and lets unexported
database state compete with canonical current-state inputs.

### Use a second state snapshot format

Rejected because it creates another owner. The declarative current SQL schema
is the only schema definition, and Planning DB remains the sole authority for
DB-authored architecture and mechanization state.

## Validation

- repository fitness test rejects Planning DB migration artifacts;
- schema bootstrap tests prove fail-closed replacement behavior;
- real PostgreSQL integration proves empty and populated rebuilds;
- rebuild/import/query/export runs twice with equivalent results and zero
  second-run repository diff;
- Planning DB, documentation, governance refresh, and pre-push gates pass.

## Related Decisions

- [ADR-0061](./ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
- [ADR-0055](./adr-0055-planning-db-canonical-operational-source.md)
