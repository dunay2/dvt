-- Record the DVT graph card source-table path rule:
-- imported warehouse sources can carry table identity as tableName/config.tableName
-- rather than metadata.table. The GraphNodeCardStrategy must preserve that
-- concrete table identity in subtitle/path while staying on the existing
-- ProjectGraphNodeCardReadModel read-model rail.

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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-CANVAS-GRAPH-NODE-CARD-DVT-SOURCE-TABLE-PATH',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'ProjectGraphNodeCardReadModel',
  'node-card',
  'GraphNodeCardStrategy keeps imported DVT source tableName/config.tableName in the technical subtitle/path instead of truncating the relation at database.schema.',
  jsonb_build_object(
    'redGreen', true,
    'sourceTablePath', true,
    'sourceTableKeys', jsonb_build_array('metadata.tableName', 'metadata.config.tableName'),
    'viewTemplateBranching', false,
    'parallelRailCreated', false
  ),
  'tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql',
  md5('evidence:GraphNodeCardStrategy:dvt-source-table-path:419')
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
    'dvtSourceTablePathProjection', true,
    'manualSections', jsonb_build_array('5. Layout nuevo de GraphNodeCardView', '6. Humanizacion de titulos')
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb))
      union all
      values ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql',
  source_content_sha256 = md5('web.component.canvas.GraphNodeCardStrategy:419'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'dvtSourceTablePathProjection', true,
    'subtitlePathPrecedence',
    jsonb_build_array(
      'metadata.table',
      'metadata.tableName',
      'metadata.config.table',
      'metadata.config.tableName',
      'node.path fallback'
    )
  ),
  source_path = 'tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql',
  source_content_sha256 = md5('file:dvtGraphNodeCardStrategy.ts:419'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'coverage', jsonb_build_array(
      'DVT operational table metrics',
      'DVT imported source tableName technical path',
      'DVT runtime metrics from recorded metadata',
      'DVT canonical runtime metrics',
      'warning status preservation',
      'DBT model context',
      'DBT source operational metrics',
      'DBT test target and severity metrics'
    )
  ),
  source_path = 'tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql',
  source_content_sha256 = md5('file:graphNodeCardReadModel.test.ts:419'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'graphNodeCardDvtSourceTablePath',
    jsonb_build_object(
      'status', 'implemented',
      'componentId', 'web.component.canvas.GraphNodeCardStrategy',
      'rail', 'ProjectGraphNodeCardReadModel',
      'subtitlePathUsesTableName', true,
      'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
    )
  ),
  source_path = 'tools/planning-db/migrations/419_graph_node_card_dvt_source_table_path.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:419'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'ProjectGraphNodeCardReadModel';
