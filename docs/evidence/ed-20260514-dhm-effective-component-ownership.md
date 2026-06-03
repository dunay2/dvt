---
title: DHM effective component file ownership
status: Accepted
date: 2026-05-14
owners:
  - planning-db
  - engine
arc_level: ARC-1
breaking: false
code_refs:
  - tools/planning-db/migrations/038_component_engineering_local_file_ownership.sql
  - tools/planning-db/migrations/039_component_engineering_effective_quality.sql
  - scripts/planning-db-migrate.test.cjs
evidence:
  tests:
    - node --test scripts/planning-db-migrate.test.cjs
    - pnpm planning:db:migrate
    - pnpm planning:db:query component-quality --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh --limit 5
    - pnpm planning:db:query component-quality --component SYS-RUNTIME-ENGINE-START-RUN-EXECUTION --no-refresh --limit 5
    - pnpm planning:db:query component-drift --component SYS-RUNTIME-ENGINE-START-RUN --no-refresh --limit 20
---

# DHM effective component file ownership

## Scope

This evidence records the follow-up DHM slice that makes DB-authored governance
components participate in effective file ownership and quality rollups.

## Result

`component_engineering.file_ownership_query` now prefers matching local
component definitions from `governance_component_local_definitions` and falls
back to imported generated ownership when there is no DB-local claim.

`component_engineering.component_quality_query` now derives component size from
effective file ownership, so DB-authored children have non-zero direct file
counts when their `owns` patterns match tracked files.

## Query evidence

`SYS-RUNTIME-ENGINE-START-RUN-ADMISSION` reports `direct_file_count=8` and
`descendant_file_count=8`.

`SYS-RUNTIME-ENGINE-START-RUN-EXECUTION` reports `direct_file_count=2` and
`descendant_file_count=2`.

`SYS-RUNTIME-ENGINE-START-RUN` drift is reduced to remaining test and fixture
files still owned by the parent. That residual drift is intentional evidence for
the next split rather than stale service ownership.
