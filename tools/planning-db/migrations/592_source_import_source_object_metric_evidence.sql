-- Product-grade source metric evidence for the existing warehouse rails.
-- This slice introduces one provider-neutral metric value object, keeps Postgres
-- estimation inside the Postgres adapter, and gives compact graph metrics an
-- accessible explanation hotspot. It does not claim that the current relational
-- import rail can already import parquet, JSON, or service resources.

with target_rail as (
  select rail_id, raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_name = 'ImportWarehouseSources'
    and rail_type = 'command'
    and ddd_owner = 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
),
new_symbols(symbol) as (
  values
    (
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
    ),
    (
      jsonb_build_object(
        'name', 'GraphNodeMetricHotspot',
        'path', 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx',
        'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
        'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
        'fowlerSignals', jsonb_build_array(
          'compact labels expose full metric meaning on hover and keyboard focus',
          'warning tone marks calculated size evidence',
          'shared presentation removes DBT and DVT tooltip duplication'
        ),
        'architectureGuard', 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
          'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
          'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts'
        )
      )
    )
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
      from (
        select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
        from (
          select existing.symbol
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
          union all
          select symbol from new_symbols
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
      coalesce(rails.symbol_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#SourceObjectMetricEvidence',
        'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts#createSourceObjectMetricEvidence',
        'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts#buildPostgresSourceObjectMetricEvidence',
        'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresPlanRowCount',
        'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresColumnsFromDataPlane',
        'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx#GraphNodeMetricHotspot',
        'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts#projectGraphNodeSourceMetricEvidence'
      )
    ) refs(ref)
  ),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/api/src/application/ports/warehouseSourceImport.ts',
        'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
        'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
        'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts',
        'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
        'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
        'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'tools/planning-db/migrations/592_source_import_source_object_metric_evidence.sql'
      )
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
  source_path = 'tools/planning-db/migrations/592_source_import_source_object_metric_evidence.sql',
  source_content_sha256 = md5('ImportWarehouseSources:source-object-metric-evidence:592'),
  revision = rails.revision + 1,
  updated_at = now()
from patched
where rails.rail_id = patched.rail_id;

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
    'Graph node cards and inspector distinguish measured byteSize from calculated estimatedByteSize and mark calculated metrics with warning tone.',
    jsonb_build_object(
      'measuredTone', 'success',
      'estimatedTone', 'warning',
      'hotspotDetail', 'Each compact metric value is a hover and keyboard-focus hotspot; Health detail remains the grouped operational view.',
      'mandatoryFollowUp', 'Introduce provider-neutral source object identity only after the round-trip authority-mode decision and before non-table adapters.'
    ),
    'tools/planning-db/migrations/592_source_import_source_object_metric_evidence.sql',
    md5('evidence:source-object-estimated-size:592')
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
