-- The implementation guard reads raw_manifest.symbols for newly introduced
-- top-level code symbols. Migration 590 registered the byte-detail helpers in
-- symbol_refs and the main policy, but each formatter must also be declared as
-- an explicit symbol fact.

with new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name',
        'formatExactBytes',
        'path',
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
        'dddOwner',
        'GraphNodeCardStrategy',
        'cqRails',
        jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
        'fowlerSignals',
        jsonb_build_array('byte_level_detail', 'presentation_query_policy'),
        'architectureGuard',
        'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage',
        'not_applicable:component_projection_unit_covered',
        'unitTests',
        jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
      )
    ),
    (
      jsonb_build_object(
        'name',
        'formatAverageBytes',
        'path',
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
        'dddOwner',
        'GraphNodeCardStrategy',
        'cqRails',
        jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
        'fowlerSignals',
        jsonb_build_array('byte_level_detail', 'presentation_query_policy'),
        'architectureGuard',
        'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage',
        'not_applicable:component_projection_unit_covered',
        'unitTests',
        jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
      )
    )
),
target_rails as (
  select rail_id, raw_manifest, symbol_refs
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
    and rail_name = 'RenderCanvasGraphNodeCard'
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct ref order by ref)
      from (
        select jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) as ref
        union all
        values
          ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatExactBytes'),
          ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatAverageBytes')
      ) refs
    ) as symbol_refs,
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      (
        select jsonb_agg(distinct symbol_value)
        from (
          select jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) as symbol_value
          union all
          select symbol from new_symbols
        ) symbols
      ),
      true
    ) as raw_manifest
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = coalesce(patched.symbol_refs, '[]'::jsonb),
  raw_manifest = patched.raw_manifest,
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from (
      select jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) as ref
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
    ) refs
  ),
  source_path = 'tools/planning-db/migrations/591_graph_node_operational_summary_byte_formatter_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-byte-formatters:591'),
  revision = revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
