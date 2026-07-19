-- Reconcile the complete implementation and proof surface of the DBT Code
-- reconciliation slice after the PR review follow-up. This does not add a rail.

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id =
    'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof'
), desired_surface(surface) as (
  values
    ('apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'::text),
    ('apps/web/src/app/views/CodeView.test.tsx'::text),
    ('apps/web/src/app/views/CodeView.tsx'::text),
    ('apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'::text),
    ('apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts'::text),
    ('apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts'::text),
    ('apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx'::text),
    ('apps/web/src/app/views/code/useCodeWorkingTreeSync.ts'::text),
    ('tools/planning-db/migrations/767_dbt_code_reconciliation_race_hardening.sql'::text),
    ('tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql'::text),
    ('tools/planning-db/migrations/769_dbt_code_reconciliation_race_feature_symbols.sql'::text),
    ('tools/planning-db/migrations/770_dbt_code_reconciliation_followup_edit_guard.sql'::text),
    ('tools/planning-db/migrations/771_dbt_code_reconciliation_slice_surfaces.sql'::text)
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select distinct surface
    from target_rail rail
    cross join lateral jsonb_array_elements_text(
      coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
    ) existing(surface)
    union
    select surface from desired_surface
  ) unique_surface
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/771_dbt_code_reconciliation_slice_surfaces.sql',
  source_content_sha256 = repeat(md5('dbt-code-reconciliation-slice-surfaces:771'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surfaces
where rail.rail_id =
  'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

do $$
declare
  missing_surface_count integer;
begin
  select count(*) into missing_surface_count
  from (
    values
      ('apps/web/src/app/views/CodeView.tsx'),
      ('apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'),
      ('apps/web/src/app/views/code/codeWorkingTreeSyncModel.ts'),
      ('apps/web/src/app/views/code/useCodeWorkingTreeSync.ts'),
      ('tools/planning-db/migrations/771_dbt_code_reconciliation_slice_surfaces.sql')
  ) required(surface)
  where not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements_text(
      coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
    ) actual(surface)
    where rail.feature_id = 'E-DBT-CODE-WORKING-TREE-SYNC-20260712'
      and actual.surface = required.surface
  );

  if missing_surface_count <> 0 then
    raise exception 'DBT Code reconciliation manifest is missing % required slice surfaces',
      missing_surface_count;
  end if;
end
$$;
