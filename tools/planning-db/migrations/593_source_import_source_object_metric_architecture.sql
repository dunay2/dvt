-- Product-grade source metric evidence for the existing warehouse rails.
-- This slice introduces one provider-neutral metric value object, keeps Postgres
-- estimation inside the Postgres adapter, and gives compact graph metrics an
-- accessible explanation hotspot. It does not claim that the current relational
-- import rail can already import parquet, JSON, or service resources.

with target_rail as (
  select rail_id, rail_name, raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where (rail_name, rail_type, ddd_owner) in (
    (
      'ImportWarehouseSources',
      'command',
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
    ),
    (
      'ListWarehouseConnectionTables',
      'query',
      'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe'
    )
  )
),
new_symbols(rail_name, symbol) as (
  values
    (
      'ImportWarehouseSources',
      jsonb_build_object(
        'name', 'SourceObjectMetricEvidence',
        'path', 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
        'dddOwner', 'api.component.sourceImport.SourceObjectMetricEvidence',
        'cqRails', jsonb_build_array('ImportWarehouseSources', 'ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array(
          'provider-neutral source object metric value object',
          'measured and estimated provenance remain explicit',
          'row and byte evidence travel together as one invariant'
        ),
        'mandatoryFollowUp', 'Replace WarehouseTable identity vocabulary with provider-neutral WarehouseSourceObject/DataSourceObject only when the authority-mode and non-relational import rails are accepted.',
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'unitTests', jsonb_build_array(
          'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
          'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
          'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts'
        )
      )
    ),
    (
      'ListWarehouseConnectionTables',
      jsonb_build_object(
        'name', 'SourceObjectMetricEvidence',
        'path', 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
        'dddOwner', 'api.component.sourceImport.SourceObjectMetricEvidence',
        'cqRails', jsonb_build_array('ImportWarehouseSources', 'ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array(
          'provider-neutral source object metric value object',
          'measured and estimated provenance remain explicit',
          'row and byte evidence travel together as one invariant'
        ),
        'mandatoryFollowUp', 'Replace WarehouseTable identity vocabulary with provider-neutral WarehouseSourceObject/DataSourceObject only when the authority-mode and non-relational import rails are accepted.',
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'unitTests', jsonb_build_array(
          'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
        )
      )
    ),
    (
      'ListWarehouseConnectionTables',
      jsonb_build_object(
        'name', 'buildPostgresSourceObjectMetricEvidence',
        'path', 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts',
        'dddOwner', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
        'cqRails', jsonb_build_array('ListWarehouseConnectionTables'),
        'fowlerSignals', jsonb_build_array(
          'provider-specific estimation stays behind the outbound adapter',
          'query-plan fallback avoids an unbounded count scan',
          'schema-width estimates are low-confidence evidence'
        ),
        'architectureGuard', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
        'unitTests', jsonb_build_array(
          'apps/api/test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
        )
      )
    )
),
patched as (
  select
    rail.rail_id,
    rail.rail_name,
    (
      select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
      from (
        select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
        from (
          select existing.symbol
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
          where coalesce(existing.symbol ->> 'name', '') not in (
            'SourceObjectMetricEvidence',
            'buildPostgresSourceObjectMetricEvidence',
            'GraphNodeMetricHotspot'
          )
          union all
          select symbol from new_symbols where rail_name = rail.rail_name
        ) symbols
        order by symbol ->> 'path', symbol ->> 'name'
      ) unique_symbols
    ) as manifest_symbols
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      (
        coalesce(rails.symbol_refs, '[]'::jsonb)
          - 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#SourceObjectMetricEvidence'
          - 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#createSourceObjectMetricEvidence'
          - 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts#buildPostgresSourceObjectMetricEvidence'
          - 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresPlanRowCount'
          - 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresColumnsFromDataPlane'
          - 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx#GraphNodeMetricHotspot'
          - 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts#projectGraphNodeSourceMetricEvidence'
      )
      || case patched.rail_name
        when 'ListWarehouseConnectionTables' then jsonb_build_array(
          'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#SourceObjectMetricEvidence',
          'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#createSourceObjectMetricEvidence',
          'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts#buildPostgresSourceObjectMetricEvidence',
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresPlanRowCount',
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresColumnsFromDataPlane'
        )
        else jsonb_build_array(
          'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#SourceObjectMetricEvidence',
          'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase'
        )
      end
    ) refs(ref)
  ),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      (
        coalesce(rails.implementation_refs, '[]'::jsonb)
          - 'apps/api/src/application/ports/warehouseSourceImport.ts'
          - 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts'
          - 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'
          - 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts'
          - 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts'
          - 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
          - 'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts'
          - 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
          - 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts'
          - 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx'
          - 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
          - 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'
          - 'tools/planning-db/migrations/592_source_import_source_object_metric_evidence.sql'
      )
      || case patched.rail_name
        when 'ListWarehouseConnectionTables' then jsonb_build_array(
          'apps/api/src/application/ports/warehouseSourceImport.ts',
          'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
          'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts',
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
          'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
          'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql'
        )
        else jsonb_build_array(
          'apps/api/src/application/ports/warehouseSourceImport.ts',
          'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
          'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
          'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
          'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql'
        )
      end
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'sourceObjectMetricEvidence',
        jsonb_build_object(
          'status', 'mandatory-transition',
          'currentDto', 'WarehouseTable',
          'targetDto', 'WarehouseSourceObject/DataSourceObject',
          'reason', 'Source Import must eventually support tables, views, parquet, JSON, service resources and other source objects without relational-only identity vocabulary.',
          'metricInvariant', 'rowCount and byteSize are one SourceObjectMetricEvidence value; every value declares measured or estimated provenance, method, and confidence.',
          'measuredTone', 'success',
          'estimatedTone', 'warning',
          'noNewRail', true,
          'currentAuthorityMode', 'graph-draft',
          'fileBackedRoundTripOutOfScope', 'buzon/20260710 dvt-dbt-roundtrip-hard-fowler-qa-revised-spec-v2-en.md',
          'implementationPlan', jsonb_build_array(
            'extract metric evidence from the application port into a domain value object',
            'keep Postgres type-width and query-plan estimation in the Postgres adapter',
            'project one shared metric presentation for DBT and DVT cards',
            'render compact values through an accessible tokenized hotspot',
            'prove the real source-import flow in the browser'
          ),
          'fowlerMatrix', jsonb_build_array(
            jsonb_build_object(
              'scenario', 'catalog returns source weight evidence',
              'opportunity', 'responsibility overload and primitive obsession',
              'pattern', 'Value Object plus Gateway',
              'dddOwner', 'api.component.sourceImport.SourceObjectMetricEvidence',
              'rail', 'ListWarehouseConnectionTables'
            ),
            jsonb_build_object(
              'scenario', 'DBT and DVT cards explain compact metrics',
              'opportunity', 'duplicate presentation semantics',
              'pattern', 'Presentation Model plus reusable View',
              'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
              'rail', 'RenderCanvasGraphNodeOperationalSummary'
            )
          )
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
  source_content_sha256 = md5('ImportWarehouseSources:source-object-metric-evidence:593'),
  revision = rails.revision + 1,
  updated_at = now()
from patched
where rails.rail_id = patched.rail_id;

-- Replace the imported markdown component source for the touched card strategy
-- with a DB-local definition while preserving its established inventory.
insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
select
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'dbFirst', true,
    'metricEvidenceProjectionComponentId', 'web.component.canvas.GraphNodeVolumeMetricProjection',
    'metricHotspotComponentId', 'web.component.canvas.GraphNodeMetricHotspot'
  ),
  'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
  md5('component:GraphNodeCardStrategy:source-object-metric-evidence:593')
from planning_query_store.frontend_component_effective_component_query
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'SourceObjectMetricEvidenceModel',
    'query-view',
    'current',
    'extract',
    'Frontend / Workspace',
    'Validate the complete provider-neutral row-count and byte-size evidence pair consumed by web read models without formatting it.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    jsonb_build_array('apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts'),
    jsonb_build_object(
      'dbFirst', true,
      'srp', 'transport evidence validation only',
      'rejectsPartialEvidence', true,
      'doesNotFormatMetrics', true
    ),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('component:SourceObjectMetricEvidenceModel:593')
  ),
  (
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'GraphNodeVolumeMetricProjection',
    'query-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Project validated source evidence or non-source runtime volume into compact GraphNodeCardMetric values and full operator detail without rendering DOM.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts'),
    jsonb_build_object(
      'dbFirst', true,
      'srp', 'volume presentation-model projection only',
      'sourceEvidenceOwner', 'web.component.workspace.SourceObjectMetricEvidenceModel',
      'consumers', jsonb_build_array(
        'web.component.canvas.GraphNodeCardStrategy',
        'web.component.canvas.GraphNodeOperationalSummary'
      )
    ),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('component:GraphNodeVolumeMetricProjection:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'GraphNodeMetricHotspot',
    'state-view',
    'current',
    'create',
    'Frontend / Canvas',
    'Render one compact metric value as a hoverable and keyboard-focusable hotspot whose tooltip exposes the supplied full detail.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx'),
    jsonb_build_object(
      'dbFirst', true,
      'srp', 'metric detail interaction and presentation only',
      'presentationOnly', true,
      'doesNotDeriveMetrics', true,
      'styleOwner', 'web.component.canvas.GraphVisualTokens'
    ),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('component:GraphNodeMetricHotspot:593')
  )
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts',
    'model',
    'readSourceObjectMetricEvidence',
    jsonb_build_object('responsibility', 'Validate the complete web metric evidence DTO.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:web-sourceObjectMetricEvidence.ts:593')
  ),
  (
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts',
    'test',
    null,
    jsonb_build_object('proves', 'Complete evidence is accepted and partial or unsafe evidence fails closed.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:web-sourceObjectMetricEvidence.test.ts:593')
  ),
  (
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
    'view-model',
    'buildGraphNodeVolumeMetricProjection',
    jsonb_build_object('responsibility', 'Project source and runtime volume into GraphNodeCardMetric values.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:graphNodeSourceMetricProjection.ts:593')
  ),
  (
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts',
    'test',
    null,
    jsonb_build_object('proves', 'Measured, estimated, incomplete, and non-source metric semantics.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:graphNodeSourceMetricProjection.test.ts:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx',
    'presentation',
    'GraphNodeMetricHotspot',
    jsonb_build_object('responsibility', 'Render supplied compact value and accessible tooltip detail.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:GraphNodeMetricHotspot.tsx:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx',
    'test',
    null,
    jsonb_build_object('proves', 'Keyboard focus exposes complete detail without native title.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:GraphNodeMetricHotspot.test.tsx:593')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizard.testFixtures.ts',
    'test-fixture',
    'buildSourceImportTestTable',
    jsonb_build_object('responsibility', 'Construct catalog-valid source objects for source-import tests.'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('file:sourceImportWizard.testFixtures.ts:593')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'ListWarehouseConnectionTables',
    'query',
    'implemented-api',
    jsonb_build_object('readModel', 'SourceObjectMetricEvidence', 'rejectsPartialEvidence', true),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('rail:web-source-evidence:ListWarehouseConnectionTables:593')
  ),
  (
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'ImportWarehouseSources',
    'command',
    'implemented-api',
    jsonb_build_object('persistedReadModel', 'metadata.sourceMetricEvidence'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('rail:web-source-evidence:ImportWarehouseSources:593')
  ),
  (
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'RenderCanvasGraphNodeOperationalSummary',
    'projection',
    'implemented-projection',
    jsonb_build_object('readModel', 'GraphNodeVolumeMetricProjection'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('rail:GraphNodeVolumeMetricProjection:RenderCanvasGraphNodeOperationalSummary:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'RenderCanvasGraphNodeCard',
    'projection',
    'implemented-projection',
    jsonb_build_object('consumer', 'GraphNodeMetricRow'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('rail:GraphNodeMetricHotspot:RenderCanvasGraphNodeCard:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'RenderCanvasGraphNodeOperationalSummary',
    'projection',
    'implemented-projection',
    jsonb_build_object('consumer', 'GraphNodeOperationalRail'),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('rail:GraphNodeMetricHotspot:RenderCanvasGraphNodeOperationalSummary:593')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status
)
values
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'SourceObjectMetricEvidence', 'module', 'domain', 'API / Source Import', 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts', 'SourceObjectMetricEvidence', 'typescript', 'high', 'implemented'),
  ('api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe', 'WorkspaceWarehouseConnectionProbe', 'adapter', 'adapter', 'API / Warehouse Source Import', 'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts', 'WarehouseConnectionProbe', 'typescript', 'high', 'implemented'),
  ('api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase', 'ImportWarehouseSourcesUseCase', 'service', 'application', 'API / Warehouse Source Import', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts', 'ImportWarehouseSourcesUseCase', 'typescript', 'high', 'implemented'),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'SourceObjectMetricEvidenceModel', 'module', 'application', 'Frontend / Workspace', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts', 'readSourceObjectMetricEvidence', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'GraphNodeVolumeMetricProjection', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts', 'buildGraphNodeVolumeMetricProjection', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeMetricHotspot', 'GraphNodeMetricHotspot', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx', 'GraphNodeMetricHotspotProps', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeCardStrategy', 'GraphNodeCardStrategy', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts', 'GraphNodeCardStrategy', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeOperationalSummary', 'GraphNodeOperationalSummary', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts', 'GraphNodeOperationalSummary', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeMetricRow', 'GraphNodeMetricRow', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx', 'GraphNodeMetricRowProps', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphNodeOperationalRail', 'GraphNodeOperationalRail', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx', 'GraphNodeOperationalRailProps', 'typescript', 'high', 'implemented'),
  ('web.component.canvas.GraphVisualTokens', 'GraphVisualTokens', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts', 'graph visual class tokens', 'typescript', 'high', 'implemented')
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  updated_at = now();

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE',
  'type',
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#SourceObjectMetricEvidence',
  'internal',
  'implemented',
  'pnpm --filter dvt-api test && pnpm --filter @dvt/web test'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  ('REL-WAREHOUSE-PROBE-USES-SOURCE-METRIC-EVIDENCE', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe', 'api.component.sourceImport.SourceObjectMetricEvidence', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', 'catalog_object_omitted_when_complete_evidence_cannot_be_produced', 'workspace_catalog_read', jsonb_build_array('ListWarehouseConnectionTables', 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts'), 'implemented'),
  ('REL-IMPORT-SOURCES-PERSISTS-SOURCE-METRIC-EVIDENCE', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase', 'api.component.sourceImport.SourceObjectMetricEvidence', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', 'import_rejects_object_missing_from_authoritative_catalog', 'workspace_source_import', jsonb_build_array('ImportWarehouseSources', 'metadata.sourceMetricEvidence'), 'implemented'),
  ('REL-WEB-VALIDATES-SOURCE-METRIC-EVIDENCE', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'api.component.sourceImport.SourceObjectMetricEvidence', 'consumes', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', 'partial_or_unsafe_evidence_is_not_projected', 'workspace_catalog_read', jsonb_build_array('ListWarehouseConnectionTables', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts'), 'implemented'),
  ('REL-GRAPH-VOLUME-PROJECTION-USES-SOURCE-EVIDENCE', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'depends_on', 'outbound', 'sync', null, 'invalid_source_evidence_produces_no_volume_metrics', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts'), 'implemented'),
  ('REL-GRAPH-CARD-STRATEGY-USES-VOLUME-PROJECTION', 'web.component.canvas.GraphNodeCardStrategy', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'depends_on', 'outbound', 'sync', null, 'card_omits_volume_when_projection_is_unavailable', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts', 'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'), 'implemented'),
  ('REL-GRAPH-OPERATIONAL-SUMMARY-USES-VOLUME-PROJECTION', 'web.component.canvas.GraphNodeOperationalSummary', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'depends_on', 'outbound', 'sync', null, 'operational_summary_omits_volume_when_projection_is_unavailable', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'), 'implemented'),
  ('REL-GRAPH-METRIC-ROW-USES-HOTSPOT', 'web.component.canvas.GraphNodeMetricRow', 'web.component.canvas.GraphNodeMetricHotspot', 'depends_on', 'outbound', 'sync', null, 'compact_metric_detail_is_not_discoverable', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx'), 'implemented'),
  ('REL-GRAPH-OPERATIONAL-RAIL-USES-HOTSPOT', 'web.component.canvas.GraphNodeOperationalRail', 'web.component.canvas.GraphNodeMetricHotspot', 'depends_on', 'outbound', 'sync', null, 'operational_metric_detail_is_not_discoverable', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'), 'implemented'),
  ('REL-GRAPH-METRIC-HOTSPOT-USES-VISUAL-TOKENS', 'web.component.canvas.GraphNodeMetricHotspot', 'web.component.canvas.GraphVisualTokens', 'depends_on', 'outbound', 'sync', null, 'hotspot_visual_language_drifts_from_graph_components', 'canvas_presentation', jsonb_build_array('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeMetricHotspotClasses'), 'implemented')
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  ('RESP-SOURCE-OBJECT-METRIC-EVIDENCE-INVARIANT', 'api.component.sourceImport.SourceObjectMetricEvidence', 'Keep row-count and byte-size values complete, non-negative, provider-neutral, and explicit about provenance, method, and confidence.', 'The source metric evidence invariant changes.', 'Source Import', 'implemented'),
  ('RESP-WEB-SOURCE-METRIC-EVIDENCE-VALIDATION', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'Validate the transport evidence pair without formatting or rendering it.', 'The web-facing metric evidence transport contract changes.', 'Workspace Read Models', 'implemented'),
  ('RESP-GRAPH-NODE-VOLUME-METRIC-PROJECTION', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'Convert validated evidence or non-source runtime volume into card metrics and operator detail.', 'Graph volume metric presentation semantics change.', 'Canvas Presentation Models', 'implemented'),
  ('RESP-GRAPH-NODE-METRIC-HOTSPOT', 'web.component.canvas.GraphNodeMetricHotspot', 'Render supplied compact value and accessible full detail without deriving metric semantics.', 'Metric detail interaction or graph visual tokens change.', 'Canvas Presentation', 'implemented')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
values
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-GRAPH-NODE-SOURCE-OBJECT-ESTIMATED-SIZE',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts; apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'RenderCanvasGraphNodeOperationalSummary',
    'source-object-estimated-size-evidence',
    'Graph node cards and inspector project the SourceObjectMetricEvidence pair, use success tone for measured values, and use warning tone for estimated values.',
    jsonb_build_object(
      'measuredTone', 'success',
      'estimatedTone', 'warning',
      'hotspotDetail', 'Each compact metric value is a hover and keyboard-focus hotspot; Health detail remains the grouped operational view.',
      'mandatoryFollowUp', 'Introduce provider-neutral source object identity only after the round-trip authority-mode decision and before non-table adapters.'
    ),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('evidence:source-object-estimated-size:593')
  ),
  (
    'web.component.workspace.SourceObjectMetricEvidenceModel',
    'EV-WEB-SOURCE-OBJECT-METRIC-EVIDENCE-FAIL-CLOSED',
    'unit-test',
    'current',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts',
    'ListWarehouseConnectionTables',
    'source-object-metric-evidence-validation',
    'Web consumers accept only a complete, safe row-count and byte-size evidence pair.',
    jsonb_build_object('partialEvidenceRejected', true, 'unsafeValuesRejected', true),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('evidence:web-source-object-metric-evidence:593')
  ),
  (
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'EV-GRAPH-NODE-VOLUME-METRIC-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts',
    'RenderCanvasGraphNodeOperationalSummary',
    'graph-node-volume-metric-projection',
    'The presentation model preserves measured and estimated evidence semantics, full values, and fail-closed source behavior.',
    jsonb_build_object('dbtDvtSharedProjection', true, 'rowOnlySourceSuppressed', true),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('evidence:graph-node-volume-metric-projection:593')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'EV-GRAPH-NODE-METRIC-HOTSPOT-ACCESSIBILITY',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx; apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx; apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'RenderCanvasGraphNodeCard',
    'graph-node-metric-hotspot-accessibility',
    'Compact graph metrics expose complete supplied detail on hover and keyboard focus without native title attributes.',
    jsonb_build_object('keyboardFocus', true, 'hoverTooltip', true, 'nativeTitle', false),
    'tools/planning-db/migrations/593_source_import_source_object_metric_architecture.sql',
    md5('evidence:graph-node-metric-hotspot-accessibility:593')
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
