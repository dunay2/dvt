-- Reconcile the implemented API/contract support files with the feature's
-- allowed surface set. Every file already cited as implementation evidence
-- must also be a permitted implementation surface for filtered validation.

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
      'tools/planning-db/migrations/652_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/653_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts'),
      ('apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts'),
      ('apps/api/src/entrypoints/http/runtimeRoutes.constants.ts'),
      ('apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts'),
      ('apps/api/test/plugins/observability.test.ts'),
      ('docs/.manifest.json'),
      ('docs/contracts/planner/index.md'),
      ('tools/planning-db/migrations/646_dbt_project_file_projection_phase2_integrity.sql'),
      ('tools/planning-db/migrations/652_dbt_project_file_projection_phase2_surface_reconciliation.sql'),
      ('tools/planning-db/migrations/653_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/654_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/652_dbt_project_file_projection_phase2_surface_reconciliation.sql'
    ),
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
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
