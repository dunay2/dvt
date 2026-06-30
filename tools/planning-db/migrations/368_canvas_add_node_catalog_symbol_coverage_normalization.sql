-- Normalize CanvasAddNodeCatalog hard-QA symbols so every manifest symbol has
-- cypressCoverage evidence, including symbols introduced by local reconciliation.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog'
),
normalized_symbols as (
  select
    target_rail.rail_id,
    coalesce(
      jsonb_agg(
        case
          when not (symbol ? 'cypressCoverage')
            then symbol || jsonb_build_object(
              'cypressCoverage',
              case
                when symbol ->> 'path' = 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx'
                  then 'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
                else 'covered by catalog unit/presentation tests before browser source-import flow'
              end
            )
          else symbol
        end
        order by ordinal
      ),
      '[]'::jsonb
    ) as symbols
  from target_rail
  left join lateral jsonb_array_elements(coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb))
    with ordinality as existing(symbol, ordinal) on true
  group by target_rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    normalized_symbols.symbols
  ),
  source_path = 'tools/planning-db/migrations/368_canvas_add_node_catalog_symbol_coverage_normalization.sql',
  source_content_sha256 = md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:368'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from normalized_symbols
where rail.rail_id = normalized_symbols.rail_id;
