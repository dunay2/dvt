---
slice: adapter-postgres-schema-timeout-fixes
date: 2026-03-15
last_reviewed: 2026-03-15
gap: maintenance
author: AI (GPT-5)
---

# Closeout: Adapter Postgres Schema And Timeout Fixes

## Think-First Analysis

### Problem summary

`@dvt/adapter-postgres` regressed in two places after the state-store extraction:
schema migration no longer guaranteed the adapter-level `statement_timeout`, and
`listStaleSnapshotRuns()` interpolated the schema name without quoting.

### Root cause

The refactor moved DDL execution into `PostgresSchemaManager.runMigrations()`,
which now owns its own transaction instead of reusing `PostgresStateStoreAdapter`
transaction helpers. That dropped the `SET LOCAL statement_timeout` behavior.
Separately, `listStaleSnapshotRuns()` remained in the adapter facade as an older
inline query while the extracted stores consistently adopted `quoteIdentifier()`.

### Constraints and invariants

- `ADR-0013`: adapter bootstrap and storage startup behavior must remain
  deterministic and operationally safe.
- `ADR-0031`: storage adapters are the authority for safe SQL boundary handling
  and tenant-safe access patterns.
- `AGENTS.md`: no hidden debt, no stubs, and negative-path validation is required.

### Options considered

- Reapply `statement_timeout` inside `PostgresSchemaManager.runMigrations()` and
  quote the stale-snapshot query in place.
- Route migration through the adapter transaction helper again.
- Move `listStaleSnapshotRuns()` fully into `PostgresRunMetadataRepository`.
- Libraries evaluated: None. This is a repo-local Postgres adapter regression,
  not a gap better solved by an external library.

### Selected option and rationale

Apply the timeout at the migration runner boundary and quote the inline stale
snapshot query in place. This is the smallest corrective slice with no contract
change and preserves the current extraction shape.

### Rejected alternatives

- Re-routing migrations through adapter helpers would re-couple DDL ownership to
  the facade and partially undo the extraction.
- Moving stale-snapshot lookup into the repository is reasonable, but it is a
  broader refactor than needed to fix the regression safely in this slice.

## Changes made

| File                                                                                                                                                                      | Change                                                                                | Why                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts](../../../packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts)                                       | Added migration-scoped `statement_timeout` support                                    | Preserve startup timeout behavior after schema-manager extraction     |
| [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)                               | Passed timeout config into schema manager and quoted stale-snapshot schema references | Prevent mixed-case schema failures and keep timeout wiring consistent |
| [packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts)   | Added migration timeout regression test                                               | Negative-path coverage for dropped `SET LOCAL statement_timeout`      |
| [packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts) | Added mixed-case schema quoting assertion for stale snapshot query                    | Negative-path coverage for schema-folding bug                         |

## Libraries evaluated

None evaluated -- no custom implementation beyond fixing local adapter regressions.

## Docs synced

- [x] None required -- no public contract, ADR, or status surface changed
- [x] This closeout file added as mandatory slice evidence

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                  | Result                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                         | Passed                             |
| `pnpm --filter @dvt/adapter-postgres typecheck`                                                                                                                                                                                                                                                                                                                                                          | Passed                             |
| `pnpm --filter @dvt/adapter-postgres test`                                                                                                                                                                                                                                                                                                                                                               | Passed (`13` passed, `23` skipped) |
| `pnpm exec eslint packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts`                                                                                              | Passed                             |
| `pnpm exec prettier --check packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts docs/planning/closeouts/20260315-adapter-postgres-schema-timeout-fixes-closeout.md` | Passed                             |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260315-adapter-postgres-schema-timeout-fixes-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                                                                                                                                                                   | Passed                             |

## Debt introduced

None.
