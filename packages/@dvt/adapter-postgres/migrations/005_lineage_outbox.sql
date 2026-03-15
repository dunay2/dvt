CREATE TABLE IF NOT EXISTS __SCHEMA__.lineage_outbox (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx
ON __SCHEMA__.lineage_outbox (created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS lineage_outbox_run_id_idx
ON __SCHEMA__.lineage_outbox (run_id);

CREATE TABLE IF NOT EXISTS __SCHEMA__.lineage_dead_letter (
  id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  last_error TEXT NOT NULL,
  dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lineage_dead_letter_run_id_idx
ON __SCHEMA__.lineage_dead_letter (run_id);
