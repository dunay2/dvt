-- G3: durable start-run intents
-- Decision: enum + unique partial index for active intents.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'start_run_intent_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.start_run_intent_status AS ENUM (
      'PENDING',
      'DISPATCHED',
      'RESOLVED',
      'EXPIRED'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.start_run_intents (
  intent_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status public.start_run_intent_status NOT NULL DEFAULT 'PENDING',
  engine_run_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT dispatched_requires_run_ref
    CHECK (status <> 'DISPATCHED' OR engine_run_ref IS NOT NULL),
  CONSTRAINT engine_run_ref_shape
    CHECK (
      engine_run_ref IS NULL OR (
        jsonb_typeof(engine_run_ref) = 'object'
        AND engine_run_ref ? 'provider'
        AND engine_run_ref ? 'tenantId'
      )
    )
);

CREATE INDEX IF NOT EXISTS intents_orphaned_idx
ON public.start_run_intents (status, created_at ASC)
WHERE status IN ('PENDING', 'DISPATCHED');

CREATE INDEX IF NOT EXISTS start_run_intents_tenant_run_idx
ON public.start_run_intents (tenant_id, run_id);

CREATE UNIQUE INDEX IF NOT EXISTS start_run_intents_active_run_uniq
ON public.start_run_intents (tenant_id, run_id)
WHERE status IN ('PENDING', 'DISPATCHED');
