---
title: DHM DB-first engine component modeling
status: Accepted
date: 2026-05-14
owners:
  - planning-db
  - engine
arc_level: ARC-1
breaking: false
code_refs:
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
evidence:
  tests:
    - node --test scripts/planning-db-query.test.cjs
    - pnpm planning:db:query component-tree --children-of SYS-RUNTIME-ENGINE-START-RUN --no-refresh --limit 20
    - pnpm planning:db:query component-metadata --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh --limit 5
    - pnpm planning:db:query component-rule-evaluations --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh --limit 20
    - pnpm planning:db:query component-drift --component SYS-RUNTIME-ENGINE-START-RUN --no-refresh --limit 5
---

# DHM DB-first engine component modeling

## Scope

This evidence records a DB-first DHM component-model slice for the engine
start-run area. The slice uses `CreateGovernanceComponent` to author component
semantics in the planning DB, then proves the model through component
engineering queries.

## DB-authored components

- `SYS-RUNTIME-ENGINE-START-RUN-ADMISSION`
- `SYS-RUNTIME-ENGINE-START-RUN-INTENT`
- `SYS-RUNTIME-ENGINE-START-RUN-EXECUTION`
- `SYS-RUNTIME-ENGINE-START-RUN-FAILURE-POLICY`

## Query evidence

`component-tree --children-of SYS-RUNTIME-ENGINE-START-RUN --no-refresh`
returned the four DB-created child components.

`component-metadata --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh`
returned `metadata_state=declared` and `quality_state=pass`.

`component-rule-evaluations --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh`
returned passing evaluations for public API, identity, parent, and owned
concern rules.

`component-drift --component SYS-RUNTIME-ENGINE-START-RUN --no-refresh`
returned actionable `file_without_leaf_component` rows with file-path metadata.
That is the expected remaining opportunity because the parent still owns files
that now have semantic child components.

## CLI hardening

The query CLI now accepts:

- `--children-of`
- `--parent-unit`
- `--no-refresh`

`--children-of` and `--parent-unit` remove ambiguity between querying a node and
querying its children. `--no-refresh` allows direct DB inspection after an
explicit refresh/import or after DB-local component commands.
