-- Canonicalize the two existing source-import mechanization manifests after the
-- source-object metric hardening slice. Every local rail for a feature receives
-- the same complete manifest so DB reads cannot expose per-rail partial contracts.

with feature_defaults (
  feature_id,
  default_owner,
  default_rails,
  default_unit_tests,
  default_fowler_signals,
  default_architecture_guard,
  default_cypress_coverage
) as (
  values
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'api.component.sourceImport.SourceObjectMetricEvidence',
      '["ImportWarehouseSources", "ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts"]'::jsonb,
      '["provider-neutral source-object metric evidence", "explicit measured-versus-estimated semantics"]'::jsonb,
      'scripts/planning-db-migrate.test.cjs',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
      'SYS-API-INFRA-WAREHOUSE-SOURCES',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts"]'::jsonb,
      '["provider adapter boundary", "fail-closed metadata permission fallback"]'::jsonb,
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    )
),
symbol_groups (
  feature_id,
  path,
  symbol_names,
  ddd_owner,
  cq_rails,
  unit_tests,
  fowler_signals,
  architecture_guard,
  cypress_coverage
) as (
  values
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/api/src/application/ports/warehouseSourceImport.ts',
      '["WarehouseTableDefinition", "WarehouseTableRef"]'::jsonb,
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
      '["ImportWarehouseSources", "ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts", "apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts"]'::jsonb,
      '["explicit application port contract", "identity-only import command payload"]'::jsonb,
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
      '["SOURCE_OBJECT_BYTE_SIZE_BASIS", "SOURCE_OBJECT_METRIC_CONFIDENCE", "SOURCE_OBJECT_METRIC_METHOD", "SOURCE_OBJECT_METRIC_PROVENANCE", "SourceObjectByteSizeBasis", "SourceObjectByteSizeMetricValue", "SourceObjectMetricConfidence", "SourceObjectMetricMethod", "SourceObjectMetricProvenance", "SourceObjectMetricValue", "assertMetricSemantics", "assertMetricValue", "createSourceObjectMetricEvidence"]'::jsonb,
      'api.component.sourceImport.SourceObjectMetricEvidence',
      '["ImportWarehouseSources", "ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts"]'::jsonb,
      '["value object", "complete row-and-byte invariant", "explicit provenance and confidence"]'::jsonb,
      'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts',
      '["SourceObjectByteSizeMetricValueCatalogSchema", "SourceObjectMetricEvidenceCatalogSchema", "SourceObjectMetricValueCatalogSchema"]'::jsonb,
      'SYS-API-INFRA-WAREHOUSE-SOURCES',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts"]'::jsonb,
      '["gateway persistence schema", "fail-closed catalog validation"]'::jsonb,
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
      '["EXACT_ROW_COUNT_TIMEOUT_MS", "PostgresByteSizeRow", "PostgresExplainRow", "PostgresRelationIdentityRow", "PostgresRowCountRow", "loadPostgresExactRowCount", "loadPostgresPlanRowCount", "loadPostgresRelationByteSize", "parsePostgresExplainRowCount", "quotePostgresIdentifier", "quotePostgresLiteral", "resolvePostgresStatisticsRowCount", "toPostgresQualifiedTableName"]'::jsonb,
      'SYS-API-INFRA-WAREHOUSE-SOURCES',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts"]'::jsonb,
      '["provider gateway", "bounded data-plane fallback", "explicit observation strategy"]'::jsonb,
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
      '["PostgresField", "PostgresQueryResult", "isPostgresPermissionError", "loadPostgresCatalogColumns", "loadPostgresColumnsFromDataPlane", "postgresTypeNameFromDataTypeId"]'::jsonb,
      'SYS-API-INFRA-WAREHOUSE-SOURCES',
      '["ListWarehouseConnectionTables", "TestWarehouseConnection"]'::jsonb,
      '["apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts"]'::jsonb,
      '["provider gateway", "metadata permission fallback", "explicit provider type projection"]'::jsonb,
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts',
      '["DEFAULT_VARIABLE_WIDTH_BYTES", "LARGE_VARIABLE_WIDTH_BYTES", "POSTGRES_TUPLE_HEADER_BYTES", "PostgresRowCountEvidence", "estimatePostgresColumnWidth", "estimatePostgresRowWidth"]'::jsonb,
      'SYS-API-INFRA-WAREHOUSE-SOURCES',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["apps/api/test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts"]'::jsonb,
      '["provider-specific strategy", "separated estimation policy", "conservative lower-confidence fallback"]'::jsonb,
      'apps/api/test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/components/canvas/canvasNodeInteractionBoundary.ts',
      '["CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE", "CANVAS_NODE_EMBEDDED_CONTROL_SELECTOR", "canvasNodeEmbeddedControlProps", "isCanvasNodeEmbeddedControlTarget"]'::jsonb,
      'web.component.canvas.CanvasNodeInteractionBoundary',
      '["OpenCanvasNodeHealthPopover", "CloseCanvasNodeHealthPopover"]'::jsonb,
      '["apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx"]'::jsonb,
      '["separated presentation interaction policy", "embedded control boundary"]'::jsonb,
      'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      '["formatSourceImportSizeEvidence"]'::jsonb,
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      '["RenderSourceImportCatalogView"]'::jsonb,
      '["apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts"]'::jsonb,
      '["presentation model", "explicit metric provenance copy"]'::jsonb,
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizard.testFixtures.ts',
      '["buildSourceImportTestMetricEvidence", "buildSourceImportTestTable"]'::jsonb,
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
      '["ListWarehouseConnectionTables", "ImportWarehouseSources"]'::jsonb,
      '["apps/web/src/app/components/SourceImportWizard.metadata.test.tsx", "apps/web/src/app/components/SourceImportWizard.test.tsx"]'::jsonb,
      '["test data builder", "one canonical valid metric fixture"]'::jsonb,
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
      'not_applicable: presentation fixture builders are exercised by source import component tests'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx',
      '["GraphNodeMetricHotspot", "GraphNodeMetricHotspotProps"]'::jsonb,
      'web.component.canvas.GraphNodeMetricHotspot',
      '["RenderCanvasGraphNodeOperationalSummary", "RenderCanvasNodeHealthPopover"]'::jsonb,
      '["apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx"]'::jsonb,
      '["reusable view", "accessible disclosure hotspot", "tokenized presentation"]'::jsonb,
      'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
      '["resolveMetricValueClassName"]'::jsonb,
      'web.component.canvas.GraphNodeMetricRow',
      '["RenderCanvasGraphNodeOperationalSummary"]'::jsonb,
      '["apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx"]'::jsonb,
      '["presentation policy", "semantic tone token selection"]'::jsonb,
      'apps/web/src/app/plugins/graph/GraphNodeMetricRow.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
      '["detailedSizeLabel", "sizeEvidenceTone"]'::jsonb,
      'web.component.canvas.GraphNodeOperationalSummary',
      '["RenderCanvasGraphNodeOperationalSummary"]'::jsonb,
      '["apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts"]'::jsonb,
      '["presentation model", "explicit source-versus-execution strategy"]'::jsonb,
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
      '["GraphNodeSizeEvidenceProjection", "GraphNodeVolumeMetricProjection", "GraphNodeVolumeMetricProjectionInput", "buildGraphNodeVolumeMetricProjection", "buildRuntimeProjection", "buildSourceProjection", "byteSizeBasisLabels", "formatByteDetail", "formatEvidenceDetail", "formatFullNumber", "methodLabels"]'::jsonb,
      'web.component.canvas.GraphNodeOperationalSummary',
      '["RenderCanvasGraphNodeOperationalSummary", "RenderCanvasNodeHealthPopover"]'::jsonb,
      '["apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts"]'::jsonb,
      '["presentation model", "provider-neutral projection", "full evidence disclosure"]'::jsonb,
      'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
      '["graphNodeMetricHotspotClasses"]'::jsonb,
      'web.component.canvas.GraphNodeMetricHotspot',
      '["RenderCanvasGraphNodeOperationalSummary"]'::jsonb,
      '["apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx"]'::jsonb,
      '["design token", "no ad hoc metric hotspot styling"]'::jsonb,
      'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/ports/workspace.ts',
      '["SourceObjectByteSizeBasis", "SourceObjectByteSizeMetricValue", "SourceObjectMetricConfidence", "SourceObjectMetricEvidence", "SourceObjectMetricMethod", "SourceObjectMetricProvenance", "SourceObjectMetricValue", "WarehouseTable", "WarehouseTableRef"]'::jsonb,
      'web.port.workspace',
      '["ListWarehouseConnectionTables", "ImportWarehouseSources"]'::jsonb,
      '["apps/web/src/app/services/workspace/workspacePorts.api.test.ts", "apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts"]'::jsonb,
      '["application port contract", "provider-neutral metric evidence DTO"]'::jsonb,
      'apps/web/src/app/services/workspace/workspacePorts.api.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts',
      '["byteSizeBases", "isNonNegativeSafeInteger", "isRecord", "metricConfidences", "metricMethods", "metricProvenances", "metricSemanticsAreValid", "readByteSizeMetricValue", "readMetricValue", "readSourceObjectMetricEvidence"]'::jsonb,
      'web.adapter.workspaceApi',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts"]'::jsonb,
      '["anti-corruption layer", "fail-closed external DTO validation"]'::jsonb,
      'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'apps/web/src/testing/workspacePortDoubles.ts',
      '["buildYamlFileName", "sourceMetricEvidence"]'::jsonb,
      'web.testing.workspacePortDoubles',
      '["ListWarehouseConnectionTables", "ImportWarehouseSources"]'::jsonb,
      '["apps/web/src/app/services/workspace/workspacePorts.imports.test.ts"]'::jsonb,
      '["test double contract parity", "valid metric evidence fixture"]'::jsonb,
      'apps/web/src/app/services/workspace/workspacePorts.imports.test.ts',
      'not_applicable: workspace test-double helpers are exercised by package tests'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'scripts/planning-db-migrate.cjs',
      '["historicalMigrationChecksums"]'::jsonb,
      'planning-db.migration-runner',
      '["ImportWarehouseSources", "ListWarehouseConnectionTables"]'::jsonb,
      '["scripts/planning-db-migrate.test.cjs"]'::jsonb,
      '["explicit reviewed migration compatibility", "all unrelated migration checksums remain strict"]'::jsonb,
      'scripts/planning-db-migrate.test.cjs',
      'not_applicable: migration checksum compatibility is covered by the migration runner unit test'
    ),
    (
      'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
      'scripts/run-dev-stack.cjs',
      '["requireLocalSourceMetricEvidence"]'::jsonb,
      'local-dev-stack.source-proof',
      '["ListWarehouseConnectionTables"]'::jsonb,
      '["scripts/run-dev-stack.test.cjs"]'::jsonb,
      '["fail-fast proof fixture", "no synthetic metric fallback"]'::jsonb,
      'scripts/run-dev-stack.test.cjs',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    )
),
expanded_symbol_specs as (
  select
    groups.feature_id,
    groups.path,
    symbol_name,
    jsonb_build_object(
      'name', symbol_name,
      'path', groups.path,
      'dddOwner', groups.ddd_owner,
      'cqRails', groups.cq_rails,
      'unitTests', groups.unit_tests,
      'fowlerSignals', groups.fowler_signals,
      'architectureGuard', groups.architecture_guard,
      'cypressCoverage', groups.cypress_coverage
    ) as symbol,
    10 as priority
  from symbol_groups groups
  cross join lateral jsonb_array_elements_text(groups.symbol_names) names(symbol_name)
),
feature_rows as (
  select rails.*
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id in (
    'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1'
  )
),
base_manifests as (
  select distinct on (feature_id)
    feature_id,
    raw_manifest
  from feature_rows
  order by
    feature_id,
    jsonb_array_length(coalesce(raw_manifest -> 'symbols', '[]'::jsonb)) desc,
    updated_at desc
),
existing_symbol_specs as (
  select
    rows.feature_id,
    symbol ->> 'path' as path,
    symbol ->> 'name' as symbol_name,
    symbol,
    0 as priority
  from feature_rows rows
  cross join lateral jsonb_array_elements(coalesce(rows.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
  where nullif(symbol ->> 'path', '') is not null
    and nullif(symbol ->> 'name', '') is not null
),
symbol_candidates as (
  select * from existing_symbol_specs
  union all
  select feature_id, path, symbol_name, symbol, priority
  from expanded_symbol_specs
),
normalized_symbol_candidates as (
  select
    candidates.feature_id,
    candidates.path,
    candidates.symbol_name,
    candidates.priority,
    candidates.symbol || jsonb_build_object(
      'dddOwner', coalesce(nullif(candidates.symbol ->> 'dddOwner', ''), defaults.default_owner),
      'cqRails', case
        when jsonb_typeof(candidates.symbol -> 'cqRails') = 'array'
          and jsonb_array_length(candidates.symbol -> 'cqRails') > 0
          then candidates.symbol -> 'cqRails'
        else defaults.default_rails
      end,
      'unitTests', case
        when jsonb_typeof(candidates.symbol -> 'unitTests') = 'array'
          and jsonb_array_length(candidates.symbol -> 'unitTests') > 0
          then candidates.symbol -> 'unitTests'
        else defaults.default_unit_tests
      end,
      'fowlerSignals', case
        when jsonb_typeof(candidates.symbol -> 'fowlerSignals') = 'array'
          and jsonb_array_length(candidates.symbol -> 'fowlerSignals') > 0
          then candidates.symbol -> 'fowlerSignals'
        else defaults.default_fowler_signals
      end,
      'architectureGuard', coalesce(
        nullif(candidates.symbol ->> 'architectureGuard', ''),
        defaults.default_architecture_guard
      ),
      'cypressCoverage', coalesce(
        nullif(candidates.symbol ->> 'cypressCoverage', ''),
        defaults.default_cypress_coverage
      )
    ) as symbol
  from symbol_candidates candidates
  join feature_defaults defaults using (feature_id)
),
deduplicated_symbols as (
  select distinct on (feature_id, path, symbol_name)
    feature_id,
    path,
    symbol_name,
    symbol
  from normalized_symbol_candidates
  order by feature_id, path, symbol_name, priority desc
),
canonical_symbols as (
  select
    feature_id,
    jsonb_agg(symbol order by path, symbol_name) as symbols
  from deduplicated_symbols
  group by feature_id
),
canonical_command_query_rails as (
  select
    feature_id,
    jsonb_agg(rail order by rail ->> 'name', rail ->> 'type') as rails
  from (
    select distinct
      rows.feature_id,
      rail
    from feature_rows rows
    cross join lateral jsonb_array_elements(
      coalesce(rows.raw_manifest -> 'commandQueryRails', '[]'::jsonb)
    ) rails(rail)
  ) unique_rails
  group by feature_id
),
canonical_implementation_refs as (
  select
    feature_id,
    jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select distinct rows.feature_id, refs.ref
    from feature_rows rows
    cross join lateral jsonb_array_elements_text(
      coalesce(rows.implementation_refs, '[]'::jsonb)
        || coalesce(rows.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
    ) refs(ref)
    union
    select feature_id, path from symbol_groups
    union
    select groups.feature_id, test_path
    from symbol_groups groups
    cross join lateral jsonb_array_elements_text(groups.unit_tests) tests(test_path)
    union
    select
      defaults.feature_id,
      'tools/planning-db/migrations/601_source_object_metric_feature_mechanization_canonicalization.sql'
    from feature_defaults defaults
  ) all_refs
  group by feature_id
),
canonical_manifests as (
  select
    defaults.feature_id,
    base.raw_manifest || jsonb_build_object(
      'version', 1,
      'featureId', defaults.feature_id,
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'commandQueryRails', command_rails.rails,
      'symbols', symbols.symbols,
      'implementationRefs', refs.refs,
      'allowedImplementationSurfaces', refs.refs,
      'architectureGuards', case defaults.feature_id
        when 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1' then jsonb_build_array(
          'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
          'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts',
          'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx',
          'scripts/planning-db-migrate.test.cjs',
          'pnpm docs:feature-mechanization:implementation'
        )
        else jsonb_build_array(
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'scripts/planning-db-migrate.test.cjs',
          'pnpm docs:feature-mechanization:implementation'
        )
      end,
      'cypressFlows', jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
      ),
      'completionGate', case defaults.feature_id
        when 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1' then jsonb_build_array(
          'pnpm planning:db:migrate',
          'pnpm --filter dvt-api test:run',
          'pnpm --filter @dvt/web test:unit:run',
          'pnpm --filter @dvt/web test:presentation:run',
          'pnpm --filter @dvt/web test:architecture:run',
          'pnpm --filter @dvt/web test:e2e:source-import:live',
          'pnpm docs:feature-mechanization:implementation',
          'pnpm verify:prepush'
        )
        else jsonb_build_array(
          'pnpm planning:db:migrate',
          'pnpm --filter dvt-api test:run',
          'pnpm --filter dvt-api typecheck',
          'pnpm --filter dvt-api lint',
          'pnpm --filter @dvt/web test:e2e:source-import:live',
          'pnpm docs:feature-mechanization:implementation',
          'pnpm verify:prepush'
        )
      end,
      'productionHardening', jsonb_build_object(
        'status', 'implemented',
        'canonicalManifestPerFeature', true,
        'observedAtRequired', true,
        'byteSizeBasisRequired', true,
        'metadataPermissionFallback', 'data-plane LIMIT 0',
        'exactCountPolicy', 'bounded server-side statement timeout',
        'lightweightConnectionTest', true,
        'browserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
      )
    ) as manifest,
    refs.refs as implementation_refs
  from feature_defaults defaults
  join base_manifests base using (feature_id)
  join canonical_symbols symbols using (feature_id)
  join canonical_command_query_rails command_rails using (feature_id)
  join canonical_implementation_refs refs using (feature_id)
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = canonical.manifest,
  implementation_refs = canonical.implementation_refs,
  allowed_implementation_surfaces = canonical.implementation_refs,
  source_path = 'tools/planning-db/migrations/601_source_object_metric_feature_mechanization_canonicalization.sql',
  source_content_sha256 = repeat(md5(canonical.feature_id || ':canonical-feature-mechanization:601'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from canonical_manifests canonical
where rails.feature_id = canonical.feature_id;

