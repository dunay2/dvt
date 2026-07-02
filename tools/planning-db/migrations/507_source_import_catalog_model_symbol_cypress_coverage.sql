-- Complete the Source Import catalog model symbol declarations with user-flow
-- coverage. The symbols were registered by migration 506; this migration keeps
-- the feature-mechanization contract complete for the existing catalog rails.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview')
),
patched_symbols as (
  select
    rail.rail_id,
    (
      select jsonb_agg(
        case
          when symbol.value ? 'cypressCoverage' then symbol.value
          else symbol.value || jsonb_build_object(
            'cypressCoverage',
            'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
          )
        end
        order by symbol.value ->> 'path', symbol.value ->> 'name'
      )
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) as symbol(value)
    ) as symbols
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails
    on target_rails.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched_symbols.symbols, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5('source-import-catalog-model-symbol-cypress-coverage:507:' || rail.rail_id),
  revision = rail.revision + 1,
  updated_at = now()
from patched_symbols
where rail.rail_id = patched_symbols.rail_id;
