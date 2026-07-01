-- Record the GraphNodeTitlePresentation precedence rule for imported sources:
-- sourceName/tableName identifies a concrete table and must win over the
-- broader database/schema relation label. This stays inside the existing
-- RenderCanvasGraphNodeCard query rail.

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
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-SOURCE-TABLE-PRECEDENCE',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
  'RenderCanvasGraphNodeCard',
  'node-card',
  'GraphNodeTitlePresentation prefers explicit sourceName/tableName table identity over database/schema relation identity for imported source cards.',
  jsonb_build_object(
    'redGreen', true,
    'sourceTablePrecedence', true,
    'databaseSchemaFallback', true,
    'technicalName', 'preserved',
    'viewTemplateBranching', false
  ),
  'tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql',
  md5('evidence:GraphNodeTitlePresentation:source-table-precedence:418')
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
    'sourceTablePrecedence', true,
    'manualSection', '6. Humanizacion de titulos'
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
  source_path = 'tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql',
  source_content_sha256 = md5('web.component.canvas.GraphNodeTitlePresentation:418'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'sourceTablePrecedence', true,
    'titlePrecedence',
    jsonb_build_array(
      'sourceName/tableName',
      'database/schema',
      'nodeName fallback'
    )
  ),
  source_path = 'tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.ts:418'),
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
      'imported sourceName/tableName precedence over database/schema',
      'model suffix guard'
    )
  ),
  source_path = 'tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.test.ts:418'),
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
        ('tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql')
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
        ('tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql')
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
    'graphNodeTitlePresentationSourceTablePrecedence',
    jsonb_build_object(
      'status', 'implemented',
      'componentId', 'web.component.canvas.GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeCard',
      'sourceTablePrecedence', true,
      'technicalName', 'preserved',
      'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
    )
  ),
  source_path = 'tools/planning-db/migrations/418_graph_node_title_presentation_source_table_precedence.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:418'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
