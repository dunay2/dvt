-- Complete the DB-first AuthorCanvasGraphEdge manifest after surfacing the
-- plugin connection policy contract as an implementation surface.

with target_rail as (
  select *
  from planning_query_store.command_query_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
patch as (
  select
    jsonb_build_array(
      'tools/planning-db/migrations/322_canvas_authoring_graph_plugin_policy_symbol_completion.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'ConnectionRuleReasonCode',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - policy contract type',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'ConnectionRuleResult',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - policy contract type',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'PluginPortDescriptor',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - policy contract type',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'PluginPortMap',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - policy contract type',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'evaluateCrossPluginBridge',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - pure connection policy',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'hasDuplicateEdge',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - pure connection policy',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      ),
      jsonb_build_object(
        'name', 'wouldCreateCycle',
        'path', 'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
        'dddOwner', 'Plugin connection policy',
        'cqRails', jsonb_build_array('AuthorCanvasGraphEdge'),
        'fowlerSignals', jsonb_build_array('Explicit Policy'),
        'architectureGuard',
          'pnpm --filter @dvt/web exec vitest run src/app/plugins/contracts/ConnectionRules.test.ts',
        'cypressCoverage', 'N/A - pure connection policy',
        'unitTests', jsonb_build_array('apps/web/src/app/plugins/contracts/ConnectionRules.test.ts'),
        'sourceKind', 'manifest_symbol'
      )
    ) as symbols
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
merged_symbols as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
    union all
    select symbol
    from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
  ) all_symbols
),
merged_implementation_refs as (
  select coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from (
    select symbol
    from target_rail,
      jsonb_array_elements(coalesce(target_rail.implementation_refs, '[]'::jsonb)) symbols(symbol)
    union all
    select symbol
    from patch, jsonb_array_elements(patch.symbols) symbols(symbol)
    union all
    select jsonb_build_object(
      'name', 'Canvas authoring graph plugin policy symbol completion',
      'path', 'tools/planning-db/migrations/322_canvas_authoring_graph_plugin_policy_symbol_completion.sql',
      'sourceKind', 'planning_db_overlay'
    )
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
  merged_symbols.value,
  merged_implementation_refs.value,
  target_rail.documentation_refs,
  target_rail.governing_sources,
  merged_allowed_surfaces.value,
  target_rail.architecture_guards,
  target_rail.completion_gate,
  'tools/planning-db/migrations/322_canvas_authoring_graph_plugin_policy_symbol_completion.sql',
  repeat('6', 64),
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
cross join merged_symbols
cross join merged_implementation_refs
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
