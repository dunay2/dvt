CREATE TABLE IF NOT EXISTS __SCHEMA__.run_event_archive_units (
  archive_unit_key TEXT PRIMARY KEY,
  tenant_bucket TEXT NOT NULL,
  persisted_at_day DATE NOT NULL,
  state TEXT NOT NULL,
  tenant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_count INTEGER NOT NULL DEFAULT 0,
  row_count BIGINT NOT NULL DEFAULT 0,
  min_run_seq INTEGER,
  max_run_seq INTEGER,
  object_key TEXT,
  checksum_sha256 TEXT,
  exported_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  delete_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.run_event_archive_batches (
  batch_id TEXT PRIMARY KEY,
  archive_unit_key TEXT NOT NULL REFERENCES __SCHEMA__.run_event_archive_units (archive_unit_key)
    ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  row_count BIGINT,
  checksum_sha256 TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS run_event_archive_units_state_day_idx
ON __SCHEMA__.run_event_archive_units (state, persisted_at_day);

CREATE INDEX IF NOT EXISTS run_event_archive_units_delete_after_idx
ON __SCHEMA__.run_event_archive_units (delete_after)
WHERE delete_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS run_event_archive_batches_unit_status_idx
ON __SCHEMA__.run_event_archive_batches (archive_unit_key, status);
