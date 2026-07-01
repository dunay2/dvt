-- Record the shared graph node relation projection used by card title, subtitle,
-- and path read models. This closes drift where DBT source titles understood
-- config.tableName while card subtitle/path did not.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCardStrategy',
  'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
  'projection-helper',
  'resolveGraphNodeRelationPath',
  jsonb_build_object(
    'role', 'shared graph node database/schema/table relation projection',
    'rails', jsonb_build_array(
      'ProjectGraphNodeCardReadModel',
      'RenderCanvasGraphNodeTitlePresentation'
    ),
    'exports', jsonb_build_array(
      'resolveGraphNodeRelationParts',
      'resolveGraphNodeRelationPath'
    ),
    'preventsDrift', 'DBT, DVT, and title presentation use one relation vocabulary for card title, subtitle, and path.'
  ),
  'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  md5('file:graphNodeCardStrategyUtils:relation-projection-convergence:465')
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
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'sharedRelationProjection',
      jsonb_build_object(
        'source', 'resolveGraphNodeRelationParts',
        'helperFile', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
        'reason', 'Title presentation must use the same database/schema/table projection as DBT and DVT card subtitle/path read models.'
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation:relation-projection-convergence:465'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'relationProjectionCoverage',
      jsonb_build_object(
        'unitTest', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'case', 'uses the same DBT relation projection for title and path metadata',
        'proves', 'DBT config.tableName is included in card subtitle/path exactly as the title projection sees it.'
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('file:graphNodeCardReadModel.test:relation-projection-convergence:465'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts';

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
  'EV-CANVAS-GRAPH-NODE-CARD-RELATION-PROJECTION-CONVERGENCE',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'ProjectGraphNodeCardReadModel',
  'graph-node-card-relation-projection',
  'GraphNodeCardStrategy projects DBT config.tableName into subtitle/path through the same relation vocabulary used by GraphNodeTitlePresentation.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected RAW.ERP.ORDERS but received RAW.ERP',
    'command', 'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
    'sharedHelper', 'resolveGraphNodeRelationPath',
    'noParallelRelationProjection', true
  ),
  'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  md5('evidence:GraphNodeCardStrategy:relation-projection-convergence:465')
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
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-CARD-RELATION-PROJECTION-CONVERGENCE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'relationProjectionConvergence',
      jsonb_build_object(
        'rail', 'ProjectGraphNodeCardReadModel',
        'titleRail', 'RenderCanvasGraphNodeTitlePresentation',
        'sharedHelper', 'resolveGraphNodeRelationPath',
        'prevents', 'parallel database/schema/table parsing across DBT, DVT, and title presentation'
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:relation-projection-convergence:465'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'relationProjectionConvergence',
      jsonb_build_object(
        'helper', 'resolveGraphNodeRelationPath',
        'bugClosed', 'DBT config.tableName was omitted from subtitle/path relation projection.',
        'tests', jsonb_build_array(
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
          'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('rail:ProjectGraphNodeCardReadModel:relation-projection-convergence:465'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'ProjectGraphNodeCardReadModel';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'relationProjectionConvergence',
      jsonb_build_object(
        'helper', 'resolveGraphNodeRelationParts',
        'upstreamComponent', 'web.component.canvas.GraphNodeCardStrategy',
        'preventsTitlePathDrift', true
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('rail:RenderCanvasGraphNodeTitlePresentation:relation-projection-convergence:465'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and rail_name = 'RenderCanvasGraphNodeTitlePresentation';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardRelationProjectionConvergence',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardStrategy',
        'rail', 'ProjectGraphNodeCardReadModel',
        'helper', 'resolveGraphNodeRelationPath',
        'redFailure', 'expected RAW.ERP.ORDERS but received RAW.ERP'
      )
    ),
  source_path = 'tools/planning-db/migrations/465_graph_node_card_relation_projection_convergence.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardStrategy:relation-projection-convergence:465'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'ProjectGraphNodeCardReadModel';
