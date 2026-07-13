-- Admit dbt seed CSV files through the existing scoped workspace file rails.
-- This is not a new command: SaveWorkspaceFileContent and ListWorkspaceFiles
-- retain ownership while their bounded file vocabulary gains a required dbt
-- project artifact.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'tools/planning-db/migrations/657_dbt_project_file_projection_phase2_seed_file_support.sql', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

with required_surface(surface) as (
  values
    ('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts'),
    ('apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts'),
    ('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.ts'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
    ('tools/planning-db/migrations/657_dbt_project_file_projection_phase2_seed_file_support.sql'),
    ('tools/planning-db/migrations/658_dbt_project_file_projection_phase2_live_closeout.sql')
), reconciled_surface as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select value as surface
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
      ) item(value)
    where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
      and value <> 'tools/planning-db/migrations/657_dbt_project_file_projection_phase2_live_closeout.sql'
    union
    select surface from required_surface
  ) all_surface
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled_surface.surfaces,
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/657_dbt_project_file_projection_phase2_seed_file_support.sql'
    ),
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{allowedImplementationSurfaces}',
    reconciled_surface.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surface
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-INFRA-WORKSPACE-FILES',
    'invariant',
    'SaveWorkspaceFileContent and ListWorkspaceFiles admit dbt seed CSV files under the same scope, size, path, and compare-and-swap policy as other authoritative project files.',
    1
  ),
  (
    'SYS-API-INFRA-WORKSPACE-FILES',
    'non_goal',
    'Create a seed-specific write command or bypass the scoped workspace repository.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
