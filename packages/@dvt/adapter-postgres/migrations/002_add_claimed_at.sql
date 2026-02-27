ALTER TABLE __SCHEMA__.outbox
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Remove redundant uniqueness: id already encodes runId+runSeq (`<runId>:<runSeq>`)
ALTER TABLE __SCHEMA__.outbox
DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key;

-- Rebuild pending index to include claimed_at for lock-claim strategy
DROP INDEX IF EXISTS __SCHEMA__.outbox_pending_idx;

CREATE INDEX IF NOT EXISTS outbox_pending_idx
ON __SCHEMA__.outbox (created_at, claimed_at)
WHERE delivered_at IS NULL;

-- Remove redundant index duplicated by PRIMARY KEY(run_id, run_seq)
DROP INDEX IF EXISTS __SCHEMA__.run_events_run_id_run_seq_idx;
