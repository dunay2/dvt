-- DVT+ Artifact Store — Reference DDL
-- Status: Spec only — NOT in production migrations (infra/db/migrations/)
-- Last updated: 2026-03-06
-- Completeness: ~50% — table design is correct; missing from production migrations,
--               missing expires_at enforcement, missing indexes, missing tenant isolation
--               at storage adapter level.
--
-- IMPLEMENTATION GAPS vs. current code:
--   1. This table does NOT exist in infra/db/migrations/ — not deployed.
--   2. ICompiledCodeStorage.upload(sha256, content) has NO tenantId param —
--      storage adapters (S3/MinIO/FS/InMemory) write to a shared namespace.
--   3. expires_at column exists here but no TTL cleanup job exists.
--   4. Only 'execution-plan' and 'compiled-sql' types are used today.
--      dbt-manifest, dbt-catalog, dbt-run-results, lineage are future.
--
-- ADR: ADR-030 (proposed) / ADR-0032 (implemented for compiled-sql + execution-plan)
-- -------------------------------------------------------------------------

create table if not exists artifacts (
  -- Identity
  tenant_id        text        not null,
  artifact_type    text        not null,  -- 'execution-plan'|'compiled-sql'|'dbt-manifest'|'dbt-catalog'|'dbt-run-results'|'lineage'
  artifact_hash    text        not null,  -- SHA-256 hex digest (64 chars) of artifact content

  -- Storage location
  artifact_uri     text        not null,  -- s3://...|gs://...|file://...|artifact://{tenant}/{type}/{hash}

  -- Metadata
  size_bytes       bigint,
  encoding         text        default 'utf-8',  -- 'utf-8' for text artifacts; null for binary
  schema_version   text,       -- e.g. '1.0.0' for versioned artifact types

  -- Lifecycle
  created_at       timestamptz not null default now(),
  expires_at       timestamptz,           -- GAP: declared but no TTL enforcement job exists

  -- Primary key: tenant + hash (content-addressed dedup within tenant)
  primary key (tenant_id, artifact_hash),

  -- Constraints
  constraint artifact_hash_format check (artifact_hash ~ '^[0-9a-f]{64}$'),
  constraint artifact_type_valid check (
    artifact_type in (
      'execution-plan',
      'compiled-sql',
      'dbt-manifest',
      'dbt-catalog',
      'dbt-run-results',
      'lineage'
    )
  ),
  constraint artifact_uri_not_empty check (length(artifact_uri) > 0),
  constraint size_bytes_non_negative check (size_bytes is null or size_bytes >= 0)
);

-- Indexes
-- Lookup by tenant + type (list all manifests for tenant)
create index if not exists idx_artifacts_tenant_type
  on artifacts (tenant_id, artifact_type);

-- Expiry scan for TTL cleanup job (when implemented)
create index if not exists idx_artifacts_expires_at
  on artifacts (expires_at)
  where expires_at is not null;

-- -------------------------------------------------------------------------
-- NOTES ON GAPS (to close before production use):
--
-- 1. ADD MIGRATION FILE:
--    Copy this DDL to infra/db/migrations/YYYY-MM-DD_artifact_store.sql
--
-- 2. TENANT ISOLATION AT STORAGE LAYER:
--    ICompiledCodeStorage.upload(sha256, content) must be updated to:
--    ICompiledCodeStorage.upload(tenantId, sha256, content)
--    All adapters (S3, MinIO, FS, InMemory) must add tenant prefix:
--      S3/MinIO key: {tenantId}/{sha256}
--      FS path: {directory}/tenants/{tenantId}/{sha256}
--      InMemory key: {tenantId}:{sha256}
--
-- 3. TTL ENFORCEMENT:
--    Add background job (pg-boss or cron) that runs:
--    DELETE FROM artifacts WHERE expires_at < now();
--    And corresponding S3/object storage cleanup.
--
-- 4. READ METHOD:
--    ICompiledCodeStorage is write-only today. Add:
--    get(tenantId: string, sha256: string): Promise<Buffer>
--    exists(tenantId: string, sha256: string): Promise<boolean>
-- -------------------------------------------------------------------------
