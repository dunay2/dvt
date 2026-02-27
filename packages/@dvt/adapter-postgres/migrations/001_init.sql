CREATE SCHEMA IF NOT EXISTS __SCHEMA__;

CREATE TABLE IF NOT EXISTS __SCHEMA__.run_metadata (
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_workflow_id TEXT NOT NULL,
  provider_run_id TEXT NOT NULL,
  provider_namespace TEXT,
  provider_task_queue TEXT,
  provider_conductor_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.run_events (
  run_id TEXT NOT NULL,
  run_seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  engine_attempt_id INTEGER NOT NULL,
  logical_attempt_id INTEGER NOT NULL,
  step_id TEXT,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (run_id, run_seq),
  UNIQUE (run_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS run_events_run_id_run_seq_idx
ON __SCHEMA__.run_events (run_id, run_seq);

CREATE TABLE IF NOT EXISTS __SCHEMA__.outbox (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  run_seq INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  UNIQUE (run_id, run_seq)
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx
ON __SCHEMA__.outbox (created_at)
WHERE delivered_at IS NULL;
