-- Record the warehouse-source title identity rule for GraphNodeTitlePresentation.
-- Imported DVT warehouse sources carry dbt sourceName/tableName metadata for
-- generated YAML artifacts, but their visible graph card title should use the
-- warehouse relation identity. The technical generated node name remains
-- available through technicalName.

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
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-WAREHOUSE-SOURCE-IDENTITY',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
  'RenderCanvasGraphNodeTitlePresentation',
  'node-card-title',
  'GraphNodeTitlePresentation uses database/schema relation identity for dvt.warehouse-source cards even when generated sourceName/tableName metadata is present.',
  jsonb_build_object(
    'redGreen', true,
    'pluginIdInput', 'dvt.warehouse-source',
    'warehouseSourceRelationPrecedence', true,
    'generatedSourceNameSuppressedFromTitle', true,
    'technicalName', 'preserved',
    'manualSection', '6. Humanizacion de titulos'
  ),
  'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  md5('evidence:GraphNodeTitlePresentation:warehouse-source-identity:453')
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
    'pluginIdInput', true,
    'warehouseSourceRelationPrecedence', true,
    'generatedSourceNameSuppressedForWarehouseSource', true,
    'viewTemplateBranching', false
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb))
      union all
      values ('EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-WAREHOUSE-SOURCE-IDENTITY')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  source_content_sha256 = md5('component:GraphNodeTitlePresentation:warehouse-source-identity:453'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'inputContract', jsonb_build_object(
      'pluginId', 'optional discriminator for plugin-specific title precedence',
      'metadata', 'primary canonical node metadata',
      'data', 'secondary React Flow node data projection'
    ),
    'warehouseSourceRelationPrecedence', true,
    'generatedSourceNameSuppressedForWarehouseSource', true
  ),
  source_path = 'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.ts:warehouse-source-identity:453'),
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
      'imported sourceName/tableName precedence over database/schema for non-warehouse DVT sources',
      'dvt.warehouse-source database/schema precedence over generated sourceName/tableName',
      'model suffix guard'
    )
  ),
  source_path = 'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.test.ts:warehouse-source-identity:453'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts';

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
    'strategy-adapter',
    'dvtGraphNodeCardStrategy',
    jsonb_build_object(
      'titlePresenterInput', 'passes CanonicalNode.pluginId into GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
    md5('file:dvtGraphNodeCardStrategy.ts:title-plugin-id:453')
  ),
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
    'strategy-adapter',
    'dbtGraphNodeCardStrategy',
    jsonb_build_object(
      'titlePresenterInput', 'passes CanonicalNode.pluginId into GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
    md5('file:dbtGraphNodeCardStrategy.ts:title-plugin-id:453')
  ),
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts',
    'strategy-adapter',
    'defaultGraphNodeCardStrategy',
    jsonb_build_object(
      'titlePresenterInput', 'passes CanonicalNode.pluginId into GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
    md5('file:defaultGraphNodeCardStrategy.ts:title-plugin-id:453')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'portCompatibilityLabels', jsonb_build_object(
      'labelPresenter', 'buildGraphNodeTitlePresentation',
      'passesPluginId', true,
      'rail', 'RenderCanvasGraphNodeCard'
    )
  ),
  source_path = 'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  source_content_sha256 = md5('file:canvasConnectionCompatibilityPresenter.ts:title-plugin-id:453'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#GraphNodeTitlePresentationInput.pluginId'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts#buildGraphNodeTitlePresentation')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts'),
        ('tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts'),
        ('scripts/planning-db-migrate.test.cjs'),
        ('tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'),
        ('node --test --test-name-pattern "warehouse source identity" scripts/planning-db-migrate.test.cjs'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'graphNodeTitlePresentationWarehouseSourceIdentity',
    jsonb_build_object(
      'status', 'implemented',
      'componentId', 'web.component.canvas.GraphNodeTitlePresentation',
      'rail', 'RenderCanvasGraphNodeTitlePresentation',
      'parentRail', 'RenderCanvasGraphNodeCard',
      'pluginIdInput', true,
      'warehouseSourceRelationPrecedence', true,
      'unitTests', jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/453_graph_node_title_warehouse_source_identity.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeTitlePresentation:warehouse-source-identity:453'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
