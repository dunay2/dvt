-- Migration: artifact_store
-- Created: 2026-03-06
-- ADR: ADR-0032 (Artifact Store)
-- Scope: Cross-tenant artifact catalog for execution-plan, compiled-sql, and lineage artifacts.

create table if not exists artifacts (
  tenant_id      text        not null,
  artifact_type  text        not null
                             check (artifact_type in (
                               'execution-plan',
                               'compiled-sql',
                               'dbt-manifest',
                               'dbt-catalog',
                               'dbt-run-results',
                               'lineage'
                             )),
  -- SHA-256 hex digest — content-addressed, immutable once written
  artifact_hash  text        not null
                             check (artifact_hash ~ '^[0-9a-f]{64}$'),
  artifact_uri   text        not null
                             check (length(artifact_uri) > 0),
  size_bytes     bigint      check (size_bytes >= 0),
  encoding       text        not null default 'utf-8',
  schema_version text,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz,

  primary key (tenant_id, artifact_hash)
);

-- Scan by tenant + kind (planner read-path)
create index if not exists idx_artifacts_tenant_type
  on artifacts (tenant_id, artifact_type);

-- TTL sweep (future GC job)
create index if not exists idx_artifacts_expires_at
  on artifacts (expires_at)
  where expires_at is not null;

comment on table artifacts is
  'Content-addressed artifact catalog. Rows are immutable after insert. '
  'Physical bytes live in the configured object store (S3/MinIO/FS). '
  'tenant_id + artifact_hash form the composite PK (content-addressed).';
