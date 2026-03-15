-- Migration 004: run_snapshots generated status column + index
-- @baseline ADR-0004: Event Sourcing Strategy — snapshot is derived from event stream
-- @baseline ADR-0015: getRunStatus read-model separation — listRuns status filter must be index-backed
--
-- The JSONB expression `snapshot->>'status'` used by listRuns is unindexed.
-- A generated stored column lets Postgres maintain the extracted value automatically
-- and allows a plain B-tree index to serve the status equality predicate.
--
-- Compatible with Postgres 12+ (GENERATED ALWAYS AS ... STORED).
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards.

CREATE TABLE IF NOT EXISTS __SCHEMA__.run_snapshots (
  run_id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED,
  last_run_seq INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE __SCHEMA__.run_snapshots
ADD COLUMN IF NOT EXISTS snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED;

CREATE INDEX IF NOT EXISTS run_snapshots_snapshot_status_idx
ON __SCHEMA__.run_snapshots (snapshot_status);
