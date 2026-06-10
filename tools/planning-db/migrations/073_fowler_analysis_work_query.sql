drop view if exists planning_query_store.fowler_analysis_work_query;

create or replace view planning_query_store.fowler_analysis_work_query as
with fowler_documents as (
  select
    lifecycle.*,
    (
      lifecycle.inbound_knowledge_reference_count
      + lifecycle.inbound_repository_reference_count
    )::int as inbound_reference_count,
    case
      when lifecycle.document_path like 'buzon/%' then 'intake'
      when lifecycle.document_path like 'docs/planning/reviews/%' then 'review'
      when lifecycle.document_path like 'docs/planning/proposals/%' then 'proposal'
      when lifecycle.document_path like 'docs/architecture/%' then 'architecture'
      when lifecycle.document_path like 'docs/evidence/%' then 'evidence'
      else lifecycle.canonicality
    end as document_class
  from planning_query_store.documentation_lifecycle_query lifecycle
  where lifecycle.document_type = 'fowler_analysis'
     or lower(lifecycle.document_path) like '%fowler%'
     or lower(lifecycle.title) like '%fowler%'
),
classified as (
  select
    fowler_documents.*,
    (
      fowler_documents.open_action_count
      + case when fowler_documents.lifecycle_gap_kind <> 'none' then 1 else 0 end
    )::int as pending_improvement_count,
    (
      fowler_documents.open_action_count > 0
      or fowler_documents.lifecycle_gap_kind <> 'none'
    ) as is_pending_improvement,
    case
      when fowler_documents.open_action_count > 0 then 'pending_improvements'
      when fowler_documents.lifecycle_gap_kind <> 'none' then 'lifecycle_gap'
      when fowler_documents.document_class = 'intake'
        and fowler_documents.inbound_reference_count > 0
        then 'blocked_by_references'
      when fowler_documents.document_class = 'intake'
        and nullif(fowler_documents.canonical_disposition, '') is null
        then 'needs_canonical_decision'
      when fowler_documents.document_class = 'intake'
        and fowler_documents.inbound_reference_count = 0
        then 'ready_to_retire'
      else 'governed'
    end as work_state
  from fowler_documents
)
select
  classified.document_id,
  classified.document_path,
  classified.document_type,
  classified.title,
  classified.status,
  classified.planning_type,
  classified.owner,
  classified.document_class,
  classified.canonicality,
  classified.lifecycle_state,
  classified.canonical_disposition,
  classified.subject_key,
  classified.action_count,
  classified.open_action_count,
  classified.inbound_knowledge_reference_count,
  classified.inbound_repository_reference_count,
  classified.inbound_reference_count,
  classified.pending_improvement_count,
  classified.is_pending_improvement,
  (
    classified.work_state = 'ready_to_retire'
    and classified.open_action_count = 0
    and classified.inbound_reference_count = 0
  ) as retirement_allowed,
  classified.work_state,
  classified.lifecycle_gap_kind,
  'pnpm planning:db:query fowler-analysis --path '
    || quote_literal(classified.document_path) || ' --limit 30' as suggested_query,
  classified.source_content_sha256
from classified;

insert into planning_query_store.db_governance_surfaces (
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  raw_surface
)
values (
  'Fowler analysis work queue',
  'planning_query_store.documentation_lifecycle_query over imported knowledge documents',
  'Import knowledge documents through pnpm governance:refresh or pnpm governance:db:import',
  'import',
  'pnpm planning:db:query fowler-analysis',
  'planning_query_store.fowler_analysis_work_query',
  'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs',
  'Hybrid indexed',
  'tools/planning-db/migrations/073_fowler_analysis_work_query.sql',
  repeat('0', 64),
  0,
  'migration',
  '{"authority":"db_projection","documentClass":"fowler_analysis","retirementModel":"logical_state"}'::jsonb
)
on conflict (surface_name) do update
set
  canonical_source = excluded.canonical_source,
  write_rail = excluded.write_rail,
  write_rail_kind = excluded.write_rail_kind,
  read_query_rail = excluded.read_query_rail,
  projection = excluded.projection,
  validation = excluded.validation,
  migration_state = excluded.migration_state,
  source_ref = excluded.source_ref,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.db_governance_surfaces.revision + 1,
  updated_by = excluded.updated_by,
  updated_at = now(),
  raw_surface = excluded.raw_surface;
