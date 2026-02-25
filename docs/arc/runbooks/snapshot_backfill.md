# Snapshot Backfill Runbook

This document explains how to rebuild the `run_snapshots` materialized table from `run_events`.

Prerequisites

- A Postgres connection with access to `run_events` and `run_snapshots`.
- Node.js >= 18 and `DATABASE_URL` env var set.

Quick start

```bash
DATABASE_URL=postgres://user:pass@host:5432/db pnpm rebuild:snapshots --batch 200
# or dry-run
DATABASE_URL=postgres://user:pass@host:5432/db pnpm rebuild:snapshots --dry-run
```

Notes

- The backfill operates in batches of distinct `run_id` to avoid excessive memory.
- Each run is upserted into `run_snapshots` inside a transaction.
- This script is intended as an operational utility; consider running it from a maintenance worker or ephemeral job runner.

Post-run

- Verify `run_snapshots` count and sample correctness:

```sql
SELECT count(*) FROM run_snapshots;
SELECT run_id, last_run_seq FROM run_snapshots ORDER BY updated_at DESC LIMIT 10;
```

- Add monitoring to detect staleness (e.g., runs where `last_run_seq` < max `run_events.run_seq` for that `run_id`).

Caveats

- If you run concurrent writes to the same runs while backfilling, snapshots may be overwritten; run process in maintenance mode or with light traffic.
- For very large datasets consider exporting run_ids and processing with parallel workers keyed by hash(run_id).
