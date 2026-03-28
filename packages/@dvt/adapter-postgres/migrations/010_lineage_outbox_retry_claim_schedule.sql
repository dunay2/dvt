ALTER TABLE __SCHEMA__.lineage_outbox
ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

ALTER TABLE __SCHEMA__.lineage_outbox
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

DROP INDEX IF EXISTS __SCHEMA__.lineage_outbox_pending_idx;

CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx
ON __SCHEMA__.lineage_outbox (next_attempt_at ASC NULLS FIRST, created_at ASC, claimed_at ASC)
WHERE status = 'pending';
