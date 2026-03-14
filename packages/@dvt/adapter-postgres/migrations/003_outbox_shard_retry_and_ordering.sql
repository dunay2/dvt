ALTER TABLE __SCHEMA__.outbox
ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

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

DROP INDEX IF EXISTS __SCHEMA__.outbox_pending_idx;

DROP INDEX IF EXISTS __SCHEMA__.outbox_pending_run_order_idx;

CREATE INDEX IF NOT EXISTS outbox_pending_idx
ON __SCHEMA__.outbox (shard_id, next_attempt_at, created_at, claimed_at)
WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
ON __SCHEMA__.outbox_dead_letter (run_id);

CREATE INDEX IF NOT EXISTS outbox_pending_run_order_idx
ON __SCHEMA__.outbox (shard_id, run_id, run_seq)
WHERE delivered_at IS NULL;
