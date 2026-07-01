-- Declare the structured metadata unwrap helper introduced for nested dbt source
-- title projection under the existing RenderCanvasGraphNodeCard rail.

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('tools/planning-db/migrations/412_graph_node_title_presentation_record_value_symbol.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('tools/planning-db/migrations/412_graph_node_title_presentation_record_value_symbol.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', 'recordValue',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('internal_projection_helper', 'structured_metadata_unwrap'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/412_graph_node_title_presentation_record_value_symbol.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:412:recordValue'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
