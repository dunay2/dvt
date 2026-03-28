ALTER TABLE __SCHEMA__.lineage_outbox
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

ALTER TABLE __SCHEMA__.lineage_dead_letter
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE __SCHEMA__.lineage_outbox o
SET tenant_id = COALESCE(
  o.payload->>'tenantId',
  m.tenant_id,
  '__unknown_tenant__'
)
FROM __SCHEMA__.run_metadata m
WHERE m.run_id = o.run_id
  AND o.tenant_id IS NULL;

UPDATE __SCHEMA__.lineage_dead_letter dl
SET tenant_id = COALESCE(
  dl.payload->>'tenantId',
  m.tenant_id,
  '__unknown_tenant__'
)
FROM __SCHEMA__.run_metadata m
WHERE m.run_id = dl.run_id
  AND dl.tenant_id IS NULL;

UPDATE __SCHEMA__.lineage_outbox
SET tenant_id = '__unknown_tenant__'
WHERE tenant_id IS NULL;

UPDATE __SCHEMA__.lineage_dead_letter
SET tenant_id = '__unknown_tenant__'
WHERE tenant_id IS NULL;

ALTER TABLE __SCHEMA__.lineage_outbox
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE __SCHEMA__.lineage_dead_letter
ALTER COLUMN tenant_id SET NOT NULL;

DROP INDEX IF EXISTS __SCHEMA__.lineage_outbox_pending_idx;

CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx
ON __SCHEMA__.lineage_outbox (next_attempt_at ASC NULLS FIRST, created_at ASC, claimed_at ASC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS lineage_outbox_tenant_pending_idx
ON __SCHEMA__.lineage_outbox (tenant_id, next_attempt_at ASC NULLS FIRST, created_at ASC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS lineage_dead_letter_tenant_dead_lettered_idx
ON __SCHEMA__.lineage_dead_letter (tenant_id, dead_lettered_at DESC);
