-- Coordinator leadership lease — one row per named worker type.
-- Workers compete by replacing expired rows with a new lease_token.
CREATE TABLE IF NOT EXISTS __SCHEMA__.run_event_archive_leases (
  worker_id   TEXT        PRIMARY KEY,
  lease_token TEXT        NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  renewed_at  TIMESTAMPTZ NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Audit log for every restore operation (single-run or full archive-unit).
CREATE TABLE IF NOT EXISTS __SCHEMA__.run_event_archive_restore_log (
  restore_id       TEXT        PRIMARY KEY,
  archive_unit_key TEXT,
  run_id           TEXT,
  target_schema    TEXT        NOT NULL,
  requester_id     TEXT        NOT NULL,
  reason           TEXT        NOT NULL,
  status           TEXT        NOT NULL,
  rows_restored    BIGINT,
  started_at       TIMESTAMPTZ NOT NULL,
  completed_at     TIMESTAMPTZ,
  error            TEXT
);

CREATE INDEX IF NOT EXISTS run_event_archive_restore_log_unit_idx
ON __SCHEMA__.run_event_archive_restore_log (archive_unit_key)
WHERE archive_unit_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS run_event_archive_restore_log_run_idx
ON __SCHEMA__.run_event_archive_restore_log (run_id)
WHERE run_id IS NOT NULL;
