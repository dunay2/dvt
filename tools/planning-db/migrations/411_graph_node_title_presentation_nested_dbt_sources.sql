-- Record review fix for GraphNodeTitlePresentation: dbt source names can arrive
-- through nested dbt/config metadata as well as top-level metadata/data.

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeTitlePresentation',
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-NESTED-DBT-SOURCES',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
  'RenderCanvasGraphNodeCard',
  'node-card',
  'GraphNodeTitlePresentation resolves dbt source titles from nested metadata.dbt/config projections used by canvas authoring.',
  jsonb_build_object(
    'redGreen', true,
    'nestedDbtSourceNameTableName', true,
    'configSourceNameTableName', true,
    'technicalName', 'preserved',
    'viewTemplateBranching', false
  ),
  'tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql',
  md5('evidence:GraphNodeTitlePresentation:nested-dbt-sources:411')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'inputSources',
    jsonb_build_array(
      'canonicalNode.metadata',
      'canonicalNode.metadata.dbt',
      'canonicalNode.metadata.config',
      'reactFlowNode.data',
      'reactFlowNode.data.dbt',
      'reactFlowNode.data.config'
    ),
    'nestedDbtSourceNameTableName', true,
    'configSourceNameTableName', true
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb))
      union all
      values ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql',
  source_content_sha256 = md5('web.component.canvas.GraphNodeTitlePresentation:411'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'inputContract', jsonb_build_object(
      'metadata', 'primary canonical node metadata',
      'metadata.dbt', 'dbt authoring metadata projection',
      'metadata.config', 'dbt config metadata projection',
      'data', 'secondary React Flow node data projection',
      'data.dbt', 'secondary dbt authoring data projection',
      'data.config', 'secondary dbt config data projection'
    ),
    'nestedDbtSourceNameTableName', true,
    'configSourceNameTableName', true
  ),
  source_path = 'tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.ts:411'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'coverage', jsonb_build_array(
      'source relation from metadata',
      'dbt sourceName/tableName projection',
      'dbt sourceName/tableName from nested metadata',
      'source relation from node data',
      'model suffix guard'
    )
  ),
  source_path = 'tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.test.ts:411'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts';

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
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql')
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
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'graphNodeTitlePresentationNestedDbtSources',
    jsonb_build_object(
      'status', 'implemented',
      'componentId', 'web.component.canvas.GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeCard',
      'nestedDbtSourceNameTableName', true,
      'configSourceNameTableName', true,
      'technicalName', 'preserved',
      'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
    )
  ),
  source_path = 'tools/planning-db/migrations/411_graph_node_title_presentation_nested_dbt_sources.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:411'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
