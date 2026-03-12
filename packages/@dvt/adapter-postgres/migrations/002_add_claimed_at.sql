ALTER TABLE __SCHEMA__.outbox
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

ALTER TABLE __SCHEMA__.outbox
ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS __SCHEMA__.outbox_dead_letter (
  id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  shard_id INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  last_error TEXT NOT NULL,
  dead_lettered_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE IF EXISTS __SCHEMA__.outbox_dead_letter
ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0;

-- Remove redundant uniqueness: id already encodes runId+runSeq (`<runId>:<runSeq>`)
ALTER TABLE __SCHEMA__.outbox
DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key;

-- Rebuild pending index to include claimed_at for lock-claim strategy
DROP INDEX IF EXISTS __SCHEMA__.outbox_pending_idx;

CREATE INDEX IF NOT EXISTS outbox_pending_idx
ON __SCHEMA__.outbox (shard_id, created_at, claimed_at)
WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
ON __SCHEMA__.outbox_dead_letter (run_id);

-- Remove redundant index duplicated by PRIMARY KEY(run_id, run_seq)
DROP INDEX IF EXISTS __SCHEMA__.run_events_run_id_run_seq_idx;
