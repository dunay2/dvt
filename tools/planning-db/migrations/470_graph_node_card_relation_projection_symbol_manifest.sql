-- Declare the relation-projection helper symbols in feature mechanization.
-- Migration 465 records the component/rail convergence; this migration records
-- the structured symbols required by the implementation guard.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#GraphNodeRelationParts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#recordValue'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#resolveGraphNodeRelationParts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts#resolveGraphNodeRelationPath')
    ) updated_refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', 'GraphNodeRelationParts',
          'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner', 'GraphNodeCardStrategy',
          'cqRails', jsonb_build_array('ProjectGraphNodeCardReadModel', 'RenderCanvasGraphNodeCard'),
          'fowlerSignals', jsonb_build_array('relation_value_object', 'projection_helper'),
          'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
        ),
        jsonb_build_object(
          'name', 'recordValue',
          'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner', 'GraphNodeCardStrategy',
          'cqRails', jsonb_build_array('ProjectGraphNodeCardReadModel', 'RenderCanvasGraphNodeTitlePresentation'),
          'fowlerSignals', jsonb_build_array('projection_helper', 'duplicate_semantics'),
          'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
        ),
        jsonb_build_object(
          'name', 'resolveGraphNodeRelationParts',
          'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner', 'GraphNodeCardStrategy',
          'cqRails', jsonb_build_array('ProjectGraphNodeCardReadModel', 'RenderCanvasGraphNodeTitlePresentation'),
          'fowlerSignals', jsonb_build_array('projection_helper', 'duplicate_semantics'),
          'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests', jsonb_build_array(
            'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
            'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'
          )
        ),
        jsonb_build_object(
          'name', 'resolveGraphNodeRelationPath',
          'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
          'dddOwner', 'GraphNodeCardStrategy',
          'cqRails', jsonb_build_array('ProjectGraphNodeCardReadModel', 'RenderCanvasGraphNodeCard'),
          'fowlerSignals', jsonb_build_array('projection_helper', 'dbt_dvt_relation_convergence'),
          'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/470_graph_node_card_relation_projection_symbol_manifest.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:relation-projection-symbol-manifest:470'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
