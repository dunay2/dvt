ALTER TABLE __SCHEMA__.run_snapshots
ADD COLUMN IF NOT EXISTS archive_unit_key TEXT;

ALTER TABLE __SCHEMA__.run_snapshots
ADD COLUMN IF NOT EXISTS event_checksum_sha256 TEXT;

ALTER TABLE __SCHEMA__.run_snapshots
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS run_snapshots_archive_unit_key_idx
ON __SCHEMA__.run_snapshots (archive_unit_key)
WHERE archive_unit_key IS NOT NULL;
