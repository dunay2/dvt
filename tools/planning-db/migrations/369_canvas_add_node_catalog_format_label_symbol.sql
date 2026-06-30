-- Register the Canvas add-node catalog label formatter touched by the
-- Source Import catalog hard-QA fix.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog'
),
symbol_patch as (
  select
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#formatCreateNodeActionLabel'::text as symbol_ref,
    jsonb_build_object(
      'name', 'formatCreateNodeActionLabel',
      'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
      'fowlerSignals', jsonb_build_array('catalog_action_i18n_label_resolution', 'source_import_catalog_entry'),
      'cypressCoverage', 'covered by catalog unit/presentation tests before browser source-import flow',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ) as symbol
),
normalized_symbols as (
  select
    target_rail.rail_id,
    coalesce(
      jsonb_agg(existing.symbol order by existing.ordinal),
      '[]'::jsonb
    ) as symbols
  from target_rail
  left join lateral jsonb_array_elements(coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb))
    with ordinality as existing(symbol, ordinal)
    on existing.symbol ->> 'name' <> 'formatCreateNodeActionLabel'
  group by target_rail.rail_id
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb) || jsonb_build_array(symbol_patch.symbol_ref)) as item(value)
    ) as symbol_refs,
    normalized_symbols.symbols || jsonb_build_array(symbol_patch.symbol) as symbols
  from target_rail rail
  join normalized_symbols on normalized_symbols.rail_id = rail.rail_id
  cross join symbol_patch
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    merged.symbols
  ),
  source_path = 'tools/planning-db/migrations/369_canvas_add_node_catalog_format_label_symbol.sql',
  source_content_sha256 = md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:369'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
