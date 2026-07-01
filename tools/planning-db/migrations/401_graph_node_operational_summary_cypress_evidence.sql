-- Complete feature mechanization symbol evidence for the operational summary
-- builder. This builder is exercised in the canvas authoring flow through the
-- GraphNodeCard read model and visual card Cypress coverage.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when symbol->>'path' = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
            and symbol->>'name' in (
              'GraphNodeOperationalSummary',
              'GraphNodeOperationalSummaryInput',
              'buildGraphNodeOperationalSummary'
            )
            then symbol || jsonb_build_object(
              'cypressCoverage',
              'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
            )
          else symbol
        end
        order by ordinal
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as symbols(symbol, ordinal)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/401_graph_node_operational_summary_cypress_evidence.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-cypress-evidence:401'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
