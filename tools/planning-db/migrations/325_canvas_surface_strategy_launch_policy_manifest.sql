-- Keep ResolveCanvasSurfaceStrategy mechanization aligned with the contextual
-- node-workbench launch policy. Node selection is no longer a workbench launch
-- source; the DB-first feature manifest must allow the strategy contract and
-- DBT/DVT strategy files that encode that policy.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1'
    and rail_name = 'ResolveCanvasSurfaceStrategy'
),
patch as (
  select jsonb_build_array(
    'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts',
    'apps/web/src/app/plugins/dbt/dbtCanvasSurfaceStrategy.ts',
    'apps/web/src/app/plugins/dvt/dvtCanvasSurfaceStrategy.ts',
    'apps/web/src/app/plugins/graphStrategyRegistry.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/325_canvas_surface_strategy_launch_policy_manifest.sql'
  ) as allowed_surfaces,
  jsonb_build_array(
    'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts#CanvasNodeWorkbenchSurfacePolicy',
    'apps/web/src/app/plugins/dbt/dbtCanvasSurfaceStrategy.ts#dbtCanvasSurfaceStrategy',
    'apps/web/src/app/plugins/dvt/dvtCanvasSurfaceStrategy.ts#dvtCanvasSurfaceStrategy',
    'apps/web/src/app/plugins/graphStrategyRegistry.test.ts#ResolveCanvasSurfaceStrategyLaunchPolicy'
  ) as implementation_refs,
  jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graphStrategyRegistry.test.ts',
    'node --test --test-name-pattern "Canvas surface strategy launch policy manifest" scripts/planning-db-migrate.test.cjs'
  ) as architecture_guards
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.implementation_refs, '[]'::jsonb))
    union
    select value
    from patch, jsonb_array_elements_text(patch.implementation_refs)
  ) refs
),
merged_architecture_guards as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.architecture_guards, '[]'::jsonb))
    union
    select value
    from patch, jsonb_array_elements_text(patch.architecture_guards)
  ) refs
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = merged_allowed_surfaces.value,
  implementation_refs = merged_implementation_refs.value,
  architecture_guards = merged_architecture_guards.value,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(rail.raw_manifest, '{}'::jsonb),
        '{allowedImplementationSurfaces}',
        merged_allowed_surfaces.value,
        true
      ),
      '{implementationRefs}',
      merged_implementation_refs.value,
      true
    ),
    '{architectureGuards}',
    merged_architecture_guards.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/325_canvas_surface_strategy_launch_policy_manifest.sql',
  source_content_sha256 = repeat('8', 64),
  updated_at = now()
from target_rail
cross join merged_allowed_surfaces
cross join merged_implementation_refs
cross join merged_architecture_guards
where rail.rail_id = target_rail.rail_id;
