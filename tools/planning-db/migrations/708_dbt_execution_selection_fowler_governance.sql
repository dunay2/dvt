-- Complete the governing-source set of the existing execution-selection
-- feature manifest without changing its rail identity.

update planning_query_store.feature_mechanization_local_rails
set
  governing_sources = governing_sources || jsonb_build_array(
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{governingSources}',
    (raw_manifest->'governingSources') || jsonb_build_array(
      'docs/architecture/fowler-opportunity-planning-governance.md'
    )
  ),
  source_path = 'tools/planning-db/migrations/708_dbt_execution_selection_fowler_governance.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:fowler-governance:708'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
      and rail.raw_manifest->'governingSources' @> jsonb_build_array(
        'docs/architecture/fowler-opportunity-planning-governance.md'
      )
  ) then
    raise exception 'CollectCanvasExecutionSelection must cite Fowler opportunity planning governance';
  end if;
end $$;
