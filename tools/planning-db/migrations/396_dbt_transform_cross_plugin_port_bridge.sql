-- Register the DBT transform-port bridge as part of the DB-first
-- AuthorCanvasGraphEdge rail. The runtime change lives in the plugin
-- contribution contract, while ConnectionRules remains the evaluator.

with imported_target_rail as (
  select
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
    raw_manifest
  from planning_query_store.command_query_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
existing_local_target_rail as (
  select
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
    raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
target_rail as (
  select *
  from existing_local_target_rail
  union all
  select *
  from imported_target_rail
  where not exists (select 1 from existing_local_target_rail)
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/plugins/dbt/dbtContributions.ts',
      'apps/web/src/app/plugins/contracts/ConnectionRules.test.ts',
      'tools/planning-db/migrations/396_dbt_transform_cross_plugin_port_bridge.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'dbtContributions.transformPortBridge',
        'path', 'apps/web/src/app/plugins/dbt/dbtContributions.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy', 'Published Interface'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - pure connection policy',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      )
    ) as implementation_refs
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from patch,
      jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(ref order by ref->>'path', ref->>'name'), '[]'::jsonb) as value
  from (
    select ref
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.implementation_refs, '[]'::jsonb)) refs(ref)
    union all
    select ref
    from patch,
      jsonb_array_elements(patch.implementation_refs) refs(ref)
    union all
    select jsonb_build_object(
      'name', 'DBT transform cross-plugin port bridge manifest',
      'path', 'tools/planning-db/migrations/396_dbt_transform_cross_plugin_port_bridge.sql',
      'sourceKind', 'planning_db_overlay'
    )
  ) all_refs
),
merged_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
      || case
        when symbol ? 'architectureGuard' then '{}'::jsonb
        else jsonb_build_object(
          'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts'
        )
      end
      || case
        when symbol ? 'cypressCoverage' then '{}'::jsonb
        else jsonb_build_object('cypressCoverage', 'N/A - pure connection policy')
      end as symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
    union all
    select ref as symbol
    from patch,
      jsonb_array_elements(patch.implementation_refs) refs(ref)
  ) all_symbols
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
  target_rail.symbol_refs,
  merged_implementation_refs.value,
  target_rail.documentation_refs,
  target_rail.governing_sources,
  merged_allowed_surfaces.value,
  target_rail.architecture_guards,
  target_rail.completion_gate,
  'tools/planning-db/migrations/396_dbt_transform_cross_plugin_port_bridge.sql',
  repeat('8', 64),
  target_rail.raw_rail,
  jsonb_set(
    jsonb_set(
      coalesce(target_rail.raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      merged_allowed_surfaces.value,
      true
    ),
    '{symbols}',
    merged_symbols.value,
    true
  ),
  0,
  'codex',
  now(),
  now()
from target_rail
cross join merged_allowed_surfaces
cross join merged_implementation_refs
cross join merged_symbols
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
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
