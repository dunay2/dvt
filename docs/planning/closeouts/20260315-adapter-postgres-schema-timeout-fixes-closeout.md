---
slice: adapter-postgres-schema-timeout-fixes
date: 2026-03-15
gap: maintenance
author: AI (GPT-5)
---

# Closeout: Adapter Postgres Schema And Timeout Fixes

## Think-First Analysis

### Problem summary

`@dvt/adapter-postgres` still had one stale-snapshot query that interpolated the
schema name without quoting, despite the rest of the adapter using quoted schema
identifiers and allowing mixed-case schema names.

### Root cause

`listStaleSnapshotRuns()` remained as an inline adapter-facade query after the
state-store extraction, while the extracted repository/store classes had already
standardized on `quoteIdentifier(this.schema)`.

### Constraints and invariants

- `ADR-0013`: startup and persistence behavior must remain deterministic and
  operationally safe.
- `ADR-0031`: storage-adapter SQL boundaries must be handled consistently and safely.
- `AGENTS.md`: no debt, no stubs, and negative-path coverage for new behavior.

### Options considered

- Quote the schema references in place and add regression coverage.
- Move `listStaleSnapshotRuns()` fully into a repository/store that already owns
  quoted SQL generation.
- Libraries evaluated: None. This is a local adapter bug, not a library gap.

### Selected option and rationale

Quote the schema references in place and add a mixed-case schema regression test.
This is the smallest safe fix against `main`.

### Rejected alternatives

- Moving the query to another class would be a broader refactor than needed for
  this corrective slice.

## Changes made

| File                                                                                                                                                                      | Change                                                | Why                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)                               | Quoted schema references in `listStaleSnapshotRuns()` | Prevent mixed-case schema lookup failures     |
| [packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts) | Added mixed-case schema regression test               | Negative-path coverage for identifier folding |

## Libraries evaluated

None evaluated — no custom implementation beyond a local bug fix.

## Docs synced

- [x] None required — no public contract, ADR, or status surface changed
- [x] This closeout file added as mandatory slice evidence

## Test evidence

| Command                                         | Result |
| ----------------------------------------------- | ------ |
| `pnpm --filter @dvt/adapter-postgres typecheck` | Passed |
| `pnpm --filter @dvt/adapter-postgres test`      | Passed |

## Debt introduced

None.
