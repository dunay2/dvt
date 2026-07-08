-- Keep feature mechanization aligned with the DB-first graph-card projection
-- fix. The implementation touches the source-import graph strategy registry
-- and introduces buildDvtArtifactPath, so both must be declared in the local
-- feature manifests that govern the Add Source live flow and byte-size card
-- rendering.

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts#buildDvtArtifactPath',
      jsonb_build_object(
        'name', 'buildDvtArtifactPath',
        'path', 'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
        'cqRails', jsonb_build_array(
          'ResolveGraphNodeCardReadModel',
          'RenderCanvasGraphNodeCard'
        ),
        'fowlerSignals', jsonb_build_array(
          'separate_relation_metadata_from_artifact_path',
          'no_generic_card_fallback_for_imported_source'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
        )
      )
    )
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
    ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
    ('apps/web/src/app/plugins/graphStrategyRegistry.ts'),
    ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('tools/planning-db/migrations/548_source_import_graph_card_feature_mechanization_reconcile.sql')
),
architecture_guards(ref) as (
  values
    ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
    ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation')
),
target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  )
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select jsonb_agg(symbol_ref) from symbol_patch)
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(existing.symbol order by existing.ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not exists (
        select 1
        from symbol_patch patch
        where patch.symbol->>'name' = existing.symbol->>'name'
          and patch.symbol->>'path' = existing.symbol->>'path'
      )
    ) || (select jsonb_agg(symbol) from symbol_patch) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || (select jsonb_agg(ref) from architecture_guards)
      ) as item(value)
    ) as architecture_guards
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{symbols}',
          merged.symbols,
          true
        ),
        '{allowedImplementationSurfaces}',
        merged.allowed_surfaces,
        true
      ),
      '{implementationRefs}',
      merged.implementation_refs,
      true
    ),
    '{architectureGuards}',
    merged.architecture_guards,
    true
  ),
  source_path = 'tools/planning-db/migrations/548_source_import_graph_card_feature_mechanization_reconcile.sql',
  source_content_sha256 = md5('source-import-graph-card-feature-mechanization-reconcile:548'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
