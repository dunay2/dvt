-- Governance import rewrites command_query_rails from canonical docs. Keep the
-- NodeWorkbench metadata-projection additions as a DB-local override of the
-- existing feature rail identity instead of adding a parallel rail.

with target_rail as (
  select *
  from planning_query_store.command_query_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#003#getworkspacegraphdraft'
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildDvtTransformInputColumnRows',
      'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts#mapDbtNodeToCanonical',
      'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts#cloneMetadata'
    ) as symbol_refs,
    jsonb_build_array(
      'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts',
      'apps/web/src/app/plugins/dbt/dbtNodeAdapter.test.ts',
      'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts',
      'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts'
    ) as allowed_surfaces,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'buildDvtTransformInputColumnRows',
        'path', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'dddOwner', 'Canvas node properties read model',
        'cqRails', jsonb_build_array('GetWorkspaceGraphDraft'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'N/A - read model',
        'unitTests', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'mapDbtNodeToCanonical',
        'path', 'apps/web/src/app/plugins/dbt/dbtNodeAdapter.ts',
        'dddOwner', 'DBT graph adapter',
        'cqRails', jsonb_build_array('GetWorkspaceGraphDraft'),
        'fowlerSignals', jsonb_build_array('adapter'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/dbt/dbtNodeAdapter.test.ts',
        'cypressCoverage', 'N/A - adapter projection',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/dbt/dbtNodeAdapter.test.ts')
      ),
      jsonb_build_object(
        'name', 'cloneMetadata',
        'path', 'apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.ts',
        'dddOwner', 'Workspace graph snapshot projection',
        'cqRails', jsonb_build_array('GetWorkspaceGraphDraft'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts',
        'cypressCoverage', 'N/A - snapshot projection',
        'unitTests',
          jsonb_build_array('apps/web/src/app/services/workspace/workspaceGraphDraftSnapshotProjection.test.ts')
      )
    ) as symbols
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
select
  target_rail.rail_id,
  target_rail.feature_id,
  target_rail.mechanization_status,
  target_rail.rail_name,
  target_rail.normalized_rail_name,
  target_rail.rail_type,
  target_rail.ddd_owner,
  'implemented',
  (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from (
      select value from jsonb_array_elements_text(coalesce(target_rail.symbol_refs, '[]'::jsonb))
      union
      select value from jsonb_array_elements_text(patch.symbol_refs)
    ) refs
  ),
  (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from (
      select value from jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb))
      union
      select value from jsonb_array_elements_text(patch.symbol_refs)
    ) refs
  ),
  target_rail.documentation_refs,
  target_rail.governing_sources,
  (
    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
      union
      select value from jsonb_array_elements_text(patch.allowed_surfaces)
    ) refs
  ),
  target_rail.architecture_guards,
  target_rail.completion_gate,
  'tools/planning-db/migrations/320_canvas_node_workbench_feature_manifest_local_override.sql',
  repeat('4', 64),
  target_rail.raw_rail,
  jsonb_set(
    jsonb_set(
      coalesce(target_rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      (
        select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
        from (
          select value
          from jsonb_array_elements_text(
            coalesce(target_rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
          )
          union
          select value from jsonb_array_elements_text(patch.allowed_surfaces)
        ) refs
      ),
      true
    ),
    '{symbols}',
    (
      select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb)
      from (
        select distinct symbol
        from (
          select symbol
          from jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
          union all
          select symbol
          from jsonb_array_elements(patch.symbols) symbols(symbol)
        ) all_symbols
      ) distinct_symbols
    ),
    true
  ),
  0,
  'codex',
  now(),
  now()
from target_rail
cross join patch
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
  updated_at = now();
