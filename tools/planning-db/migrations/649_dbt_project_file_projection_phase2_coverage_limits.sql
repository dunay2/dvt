-- Make manifest coverage and filesystem traversal limits explicit DB-first
-- behavior. Unsupported dbt graph resources are diagnosed, never silently
-- discarded, and directory count/depth are charged before recursion.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) as item(surface)
    where surface not in (
      'tools/planning-db/migrations/649_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/650_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('tools/planning-db/migrations/649_dbt_project_file_projection_phase2_coverage_limits.sql'),
      ('tools/planning-db/migrations/650_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/651_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/649_dbt_project_file_projection_phase2_coverage_limits.sql'
    ),
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_rail = jsonb_set(
    rail.raw_rail,
    '{negativeTests}',
    coalesce(rail.raw_rail -> 'negativeTests', '[]'::jsonb)
      || jsonb_build_array(
        'emit dbt_resource_not_projected for unsupported manifest graph resources',
        'reject project directory-count overflow before analyzer launch',
        'reject project directory-depth overflow before analyzer launch'
      ),
    true
  ),
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surfaces
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

update architecture.component_observability
set signal_name = 'Invalid projects expose fixed safe diagnostics; unsupported manifest graph resources emit dbt_resource_not_projected; project bytes, files, directories, and depth are bounded before analyzer launch.'
where observability_id = 'OBS-DBT-PROJECT-ANALYZER-RESULT';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
