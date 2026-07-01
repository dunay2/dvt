-- Complete the structured feature-mechanization symbol manifest for the
-- GraphNodeTitlePresentation acronym hint helper introduced in migration 435.
-- Migration 435 registered the component rail and evidence; this migration
-- makes the new code symbol visible to the implementation guard.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name', 'displayIdentifier',
          'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
          'dddOwner', 'GraphNodeTitlePresentation',
          'cqRails', jsonb_build_array('RenderCanvasGraphNodeTitlePresentation'),
          'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
          'fowlerSignals', jsonb_build_array('internal_projection_helper', 'acronym_hint_projection'),
          'cypressCoverage', 'not_applicable:read_model_projection_unit_and_presentation_covered',
          'architectureGuard', 'scripts/planning-db-migrate.test.cjs'
        )
      ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values ('tools/planning-db/migrations/436_graph_node_title_presentation_acronym_symbol_manifest.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values ('tools/planning-db/migrations/436_graph_node_title_presentation_acronym_symbol_manifest.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/436_graph_node_title_presentation_acronym_symbol_manifest.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:436:displayIdentifier'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
