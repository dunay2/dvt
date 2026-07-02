-- Register the warehouse-source connection identity projection used by Graph node cards.
-- ImportWarehouseSources owns the persisted connection identity. GraphNodeTitlePresentation
-- owns the visible title projection and must prefer that connection identity over
-- generated relation/database fallback text.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'Warehouse source connection identity for graph node cards',
  'Frontend / Canvas',
  'implemented',
  'Imported warehouse source cards should expose the warehouse connection family, such as Postgres, instead of leaking generated database identifiers as the visible source identity. ImportWarehouseSources persists the catalog-owned connection identity and GraphNodeTitlePresentation renders it as the card title vocabulary.',
  'published_language',
  'ImportWarehouseSources;RenderCanvasGraphNodeTitlePresentation',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'component',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'component',
    'web.component.canvas.GraphNodeTitlePresentation',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'flow',
    'ImportWarehouseSources',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'query',
    'RenderCanvasGraphNodeTitlePresentation',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'path',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'path',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'path',
    'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-GRAPH-NODE-WAREHOUSE-CONNECTION-IDENTITY-20260701',
    'path',
    'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-WAREHOUSE-CONNECTION-TYPE',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
  'RenderCanvasGraphNodeTitlePresentation',
  'node-card-title',
  'GraphNodeTitlePresentation uses the persisted warehouse connectionType for dvt.warehouse-source card titles and keeps the generated technical node name separate.',
  jsonb_build_object(
    'redGreen', true,
    'pluginIdInput', 'dvt.warehouse-source',
    'connectionTypePrecedence', true,
    'databaseFallback', 'only when connectionType is absent',
    'technicalName', 'preserved',
    'manualSection', '6. Humanizacion de titulos'
  ),
  'tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql',
  md5('evidence:GraphNodeTitlePresentation:warehouse-connection-type:486')
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
    'warehouseConnectionTypePrecedence', true,
    'connectionIdentityProducerRail', 'ImportWarehouseSources',
    'connectionIdentityConsumerRail', 'RenderCanvasGraphNodeTitlePresentation'
  ),
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb))
      union all
      values ('EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-WAREHOUSE-CONNECTION-TYPE')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql',
  source_content_sha256 = md5('component:GraphNodeTitlePresentation:warehouse-connection-type:486'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'inputContract', jsonb_build_object(
      'connectionType', 'optional catalog-owned warehouse connection family persisted by ImportWarehouseSources',
      'database', 'fallback relation identifier only when connectionType is unavailable',
      'schema', 'visible warehouse namespace'
    ),
    'warehouseSourceConnectionTypePrecedence', true,
    'connectionIdentityProducerRail', 'ImportWarehouseSources'
  ),
  source_path = 'tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.ts:warehouse-connection-type:486'),
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
      'dvt.warehouse-source connectionType precedence over database fallback',
      'model suffix guard'
    )
  ),
  source_path = 'tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql',
  source_content_sha256 = md5('file:graphNodeTitlePresentation.test.ts:warehouse-connection-type:486'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTitlePresentation'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.execute'),
        ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts#appendImportedSourceNodes'),
        ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts#toSourceNode'),
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
        ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
        ('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
        ('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('scripts/planning-db-migrate.test.cjs'),
        ('tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts'),
        ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts'),
        ('node --test --test-name-pattern "warehouse source connection identity" scripts/planning-db-migrate.test.cjs'),
        ('pnpm docs:feature-mechanization:implementation')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeTitlePresentationWarehouseConnectionIdentity',
      jsonb_build_object(
        'status', 'implemented',
        'producerComponentId', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
        'consumerComponentId', 'web.component.canvas.GraphNodeTitlePresentation',
        'producerRail', 'ImportWarehouseSources',
        'consumerRail', 'RenderCanvasGraphNodeTitlePresentation',
        'parentRail', 'RenderCanvasGraphNodeCard',
        'connectionTypePrecedence', true,
        'unitTests',
        jsonb_build_array(
          'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
          'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts'
        )
      ),
      'symbols',
      coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'ImportWarehouseSourcesUseCase.execute',
            'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
            'dddOwner', 'Warehouse source import',
            'cqRails', jsonb_build_array('ImportWarehouseSources'),
            'fowlerSignals', jsonb_build_array('application_service', 'published_language'),
            'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
            'cypressCoverage', 'N/A - backend application service',
            'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')
          ),
          jsonb_build_object(
            'name', 'appendImportedSourceNodes',
            'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
            'dddOwner', 'Warehouse source import graph projection',
            'cqRails', jsonb_build_array('ImportWarehouseSources'),
            'fowlerSignals', jsonb_build_array('read_model_projection'),
            'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
            'cypressCoverage', 'N/A - backend application service',
            'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')
          ),
          jsonb_build_object(
            'name', 'toSourceNode',
            'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
            'dddOwner', 'Warehouse source import graph projection',
            'cqRails', jsonb_build_array('ImportWarehouseSources'),
            'fowlerSignals', jsonb_build_array('read_model_projection'),
            'architectureGuard', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts',
            'cypressCoverage', 'N/A - backend application service',
            'unitTests', jsonb_build_array('apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts')
          ),
          jsonb_build_object(
            'name', 'buildGraphNodeTitlePresentation',
            'path', 'apps/web/src/app/plugins/graph/graphNodeTitlePresentation.ts',
            'dddOwner', 'Graph node title presentation',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeTitlePresentation'),
            'fowlerSignals', jsonb_build_array('read_model_projection', 'published_language'),
            'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeTitlePresentation.test.ts',
            'cypressCoverage', 'N/A - pure presenter',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeTitlePresentation.test.ts')
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/486_warehouse_source_connection_identity_title_projection.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:warehouse-source-connection-identity:486'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
