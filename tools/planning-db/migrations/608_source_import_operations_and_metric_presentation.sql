-- Reconcile source-import operation DTOs and reusable metric evidence
-- presentation without creating parallel product intents. The new components
-- participate in the existing source-import and graph-render query/command rails.

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values
  (
    'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
    'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts',
    repeat(md5('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS:608'), 2),
    0,
    'Source import operations contract',
    'component',
    'SYS-CONTRACTS-ROOT',
    'SYS-DVT',
    'SYS-CONTRACTS',
    'canonical',
    false,
    'Own the shared HTTP command and response DTOs for warehouse connections, connection tests, and source import receipts.',
    'SourceImportOperationsContract',
    'ListWarehouseConnections;CreateWarehouseConnection;TestWarehouseConnection;ImportWarehouseSources',
    'codex'
  ),
  (
    'web.component.metrics.SourceObjectMetricEvidencePresenter',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts',
    repeat(md5('web.component.metrics.SourceObjectMetricEvidencePresenter:608'), 2),
    0,
    'Source object metric evidence presenter',
    'component',
    'SYS-WEB-ROOT',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Describe metric provenance, acquisition method, confidence, storage basis, and observation scope without rendering DOM.',
    'SourceObjectMetricEvidencePresentationModel',
    'RenderCanvasGraphNodeOperationalSummary;RenderSourceImportCatalogView',
    'codex'
  ),
  (
    'web.component.metrics.MetricEvidenceHotspot',
    'apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx',
    repeat(md5('web.component.metrics.MetricEvidenceHotspot:608'), 2),
    0,
    'Metric evidence hotspot',
    'component',
    'SYS-WEB-ROOT',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Render compact measured or estimated metric values with tokenized visual tone and accessible full-detail disclosure.',
    'MetricEvidenceHotspotPresentation',
    'RenderCanvasGraphNodeOperationalSummary;RenderSourceImportCatalogView',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
  'web.component.metrics.SourceObjectMetricEvidencePresenter',
  'web.component.metrics.MetricEvidenceHotspot'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'owns', 'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'owns', 'packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts', 1),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'owns', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'owns', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.test.ts', 1),
  ('web.component.metrics.MetricEvidenceHotspot', 'owns', 'apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'owns', 'apps/web/src/app/components/metrics/metricEvidenceTokens.ts', 1),
  ('web.component.metrics.MetricEvidenceHotspot', 'owns', 'apps/web/src/app/components/metrics/MetricEvidenceHotspot.test.tsx', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

-- The catalog component is a component family: pure model, reusable view
-- primitives, active-object metadata, selection basket, and focused tests.
insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts', 2),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts', 3),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx', 4),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx', 5),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx', 6),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx', 7),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx', 8)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Own the categorized source-object catalog presentation family: pure view model, selection controls, metadata, evidence hotspots, and selected-source basket.',
  ddd_owner = 'SourceImportCatalogViewPresentation',
  cq_rails = 'RenderSourceImportCatalogView',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'responsibility', 'Validate one shared transport shape for connection commands, test results, import commands, and complete import receipts.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'invariant', 'ImportSourceObjectsResultSchema always returns draftRevision and importedNodeIds so canvas reconciliation cannot consume an incomplete receipt.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'invariant', 'ImportSourceObjectsRequestSchema reuses SourceObjectSelectionListSchema and rejects duplicate object IDs.', 1),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'fowler_signal', 'Published Language', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'public_api', 'SourceImportOperations.v1 exports warehouse connection, connection test, import request, and complete import result runtime schemas.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'transition', 'The shared contract is canonical only when API routes/use cases and the Web HTTP adapter validate the same schemas with no local DTO authority.', 0),
  ('SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'consumer', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES;SYS-API-HTTP-WORKSPACE-ROUTES;SYS-WEB-SERVICES-WORKSPACE', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'responsibility', 'Project complete source metric evidence into operator-readable detail without React or canvas dependencies.', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'invariant', 'Every detail states measured or estimated provenance, method, confidence, observation scope, and byte basis when applicable.', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'fowler_signal', 'Presentation Model', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'public_api', 'describeSourceObjectMetricEvidence projects validated evidence into complete operator-facing detail.', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'transition', 'The presenter is canonical when graph and source catalog surfaces delegate evidence wording instead of duplicating it.', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'consumer', 'web.component.canvas.GraphNodeVolumeMetricProjection;SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'responsibility', 'Render supplied compact value and detail using one accessible tokenized hotspot template.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'invariant', 'Measured values use measured tone and estimates use estimated tone; neither state is inferred in the template.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'fowler_signal', 'Separated Presentation', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'public_api', 'MetricEvidenceHotspot renders a compact value, evidence detail, focus posture, and measured/estimated visual tone.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'transition', 'The hotspot is canonical when canvas and source catalog adapters reuse its tokenized accessible template.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'consumer', 'web.component.canvas.GraphNodeMetricHotspot;SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 0),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'Relational object IDs exactly encode opaque physical catalog, schema, and object identifiers without trimming or case folding.', 5),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'SourceObjectListSchema rejects duplicate object IDs and SourceObjectConstraintSchema preserves composite constraints.', 6),
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'Metric evidence carries snapshot scope for finite objects and bounded-window scope for streams.', 7)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  status,
  parent_component_id
)
values
  (
    'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
    'Source import operations contract',
    'port',
    'contracts',
    'SourceImportOperationsContract',
    'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts',
    'Runtime schemas for warehouse connection operations and complete source import command receipts',
    'node',
    'high',
    'implemented',
    'SYS-CONTRACTS-ROOT'
  ),
  (
    'web.component.metrics.SourceObjectMetricEvidencePresenter',
    'Source object metric evidence presenter',
    'module',
    'ui',
    'SourceObjectMetricEvidencePresentationModel',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts',
    'Pure evidence detail projection for graph and source catalog presentation',
    'browser',
    'high',
    'implemented',
    'SYS-WEB-ROOT'
  ),
  (
    'web.component.metrics.MetricEvidenceHotspot',
    'Metric evidence hotspot',
    'ui-view',
    'ui',
    'MetricEvidenceHotspotPresentation',
    'apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx',
    'Accessible tokenized tooltip hotspot for measured and estimated compact metrics',
    'browser',
    'high',
    'implemented',
    'SYS-WEB-ROOT'
  )
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

update architecture.component
set
  public_contract = 'SourceObjectCatalogResponse v1 with unique stable object identities, opaque locators, composite constraints, and complete scoped row/byte evidence',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG';

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
  'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1',
  'api',
  'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
  'packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts',
  'breaking',
  'implemented',
  'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceImportOperations.v1.test.ts'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
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
  ('RESP-SOURCE-IMPORT-OPERATIONS-PUBLISHED-LANGUAGE', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'Own source-import operation request and response schemas shared across API and Web.', 'An operation payload or compatibility policy changes.', 'SourceImportOperationsContract', 'implemented'),
  ('RESP-SOURCE-METRIC-EVIDENCE-PRESENTER', 'web.component.metrics.SourceObjectMetricEvidencePresenter', 'Describe validated metric evidence for demanding-user presentation surfaces.', 'The operator-facing evidence vocabulary changes.', 'SourceObjectMetricEvidencePresentationModel', 'implemented'),
  ('RESP-METRIC-EVIDENCE-HOTSPOT', 'web.component.metrics.MetricEvidenceHotspot', 'Render supplied metric evidence detail using one visual and accessibility template.', 'The reusable metric evidence interaction or visual tokens change.', 'MetricEvidenceHotspotPresentation', 'implemented')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  ('TEST-SOURCE-IMPORT-OPERATIONS-CONTRACT', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/contracts exec vitest run test/source-import/SourceImportOperations.v1.test.ts'),
  ('TEST-SOURCE-METRIC-EVIDENCE-PRESENTER', 'web.component.metrics.SourceObjectMetricEvidencePresenter', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/services/workspace/sourceObjectMetricEvidencePresentation.test.ts'),
  ('TEST-METRIC-EVIDENCE-HOTSPOT', 'web.component.metrics.MetricEvidenceHotspot', 'apps/web/src/app/components/metrics/MetricEvidenceHotspot.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/components/metrics/MetricEvidenceHotspot.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
  ('REL-SOURCE-IMPORT-OPERATIONS-USES-SOURCE-OBJECT-SELECTION', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1', 'Operation DTOs drift from the source object selection published language', 'workspace', jsonb_build_array('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'packages/@dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts'), 'implemented'),
  ('REL-SOURCE-IMPORT-OPERATIONS-TO-API', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'exposes_api', 'outbound', 'sync', 'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1', 'API accepts or emits a source import operation shape outside the shared contract', 'workspace', jsonb_build_array('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'apps/api/src/application/ports/warehouseSourceImport.ts', 'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts'), 'implemented'),
  ('REL-SOURCE-IMPORT-OPERATIONS-TO-WEB', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', 'SYS-WEB-SERVICES-WORKSPACE', 'exposes_api', 'outbound', 'sync', 'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1', 'Web accepts an incomplete connection or import response', 'workspace', jsonb_build_array('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'apps/web/src/app/ports/workspace.ts', 'apps/web/src/app/services/workspace/workspacePorts.api.ts'), 'implemented'),
  ('REL-GRAPH-VOLUME-PROJECTION-USES-METRIC-PRESENTER', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'web.component.metrics.SourceObjectMetricEvidencePresenter', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1', 'Graph metrics omit provenance, confidence, basis, or observation scope', 'not_applicable', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts'), 'implemented'),
  ('REL-SOURCE-CATALOG-USES-METRIC-PRESENTER', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'web.component.metrics.SourceObjectMetricEvidencePresenter', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1', 'Source catalog presents estimated metrics as exact', 'not_applicable', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts'), 'implemented'),
  ('REL-GRAPH-METRIC-HOTSPOT-USES-GENERIC-HOTSPOT', 'web.component.canvas.GraphNodeMetricHotspot', 'web.component.metrics.MetricEvidenceHotspot', 'depends_on', 'outbound', 'sync', null, 'Graph wrapper duplicates or diverges from the global metric evidence interaction', 'not_applicable', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx', 'apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx'), 'implemented'),
  ('REL-SOURCE-CATALOG-USES-METRIC-HOTSPOT', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW', 'web.component.metrics.MetricEvidenceHotspot', 'depends_on', 'outbound', 'sync', null, 'Source catalog metric evidence lacks consistent hover and keyboard disclosure', 'not_applicable', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx', 'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx', 'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx'), 'implemented')
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

-- Reuse the accepted product rails. These rows express component participation,
-- not new commands or queries.
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
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'RenderCanvasGraphNodeOperationalSummary', 'projection', 'implemented-projection', jsonb_build_object('name', 'RenderCanvasGraphNodeOperationalSummary', 'type', 'query', 'role', 'metric evidence presentation model'), 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql', md5('metric-presenter:graph:608')),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'RenderSourceImportCatalogView', 'projection', 'implemented-projection', jsonb_build_object('name', 'RenderSourceImportCatalogView', 'type', 'query', 'role', 'metric evidence presentation model'), 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql', md5('metric-presenter:catalog:608')),
  ('web.component.metrics.MetricEvidenceHotspot', 'RenderCanvasGraphNodeOperationalSummary', 'projection', 'implemented-projection', jsonb_build_object('name', 'RenderCanvasGraphNodeOperationalSummary', 'type', 'query', 'role', 'metric evidence template'), 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql', md5('metric-hotspot:graph:608')),
  ('web.component.metrics.MetricEvidenceHotspot', 'RenderSourceImportCatalogView', 'projection', 'implemented-projection', jsonb_build_object('name', 'RenderSourceImportCatalogView', 'type', 'query', 'role', 'metric evidence template'), 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql', md5('metric-hotspot:catalog:608'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

-- Correct the command owner: testing a warehouse connection is an API
-- application capability invoked by the UI, not a UI-owned command.
update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'dddOwner', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'contract', 'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1'
  ),
  source_path = 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql',
  source_content_sha256 = repeat(md5(rail_id || ':owner:608'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'TestWarehouseConnection'
  and rail_type = 'command'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

-- Keep the historical documented table vocabulary retired even if a docs
-- import rehydrates it. Local rows win over imported rows by rail name/type.
update planning_query_store.command_query_rails
set
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'status', 'retired',
    'canonicalRail', 'ListWarehouseConnectionSourceObjects',
    'retirementReason', 'The provider-neutral SourceObject catalog replaces relational table vocabulary.'
  )
where rail_name = 'ListWarehouseConnectionTables'
  and rail_type = 'query';

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
values (
  'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG#query#retired-table-vocabulary#listwarehouseconnectiontables',
  'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
  'closed',
  'ListWarehouseConnectionTables',
  'listwarehouseconnectiontables',
  'query',
  'SYS-API-INFRA-WAREHOUSE-SOURCES',
  'retired',
  '[]'::jsonb,
  jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts#ListWarehouseConnectionSourceObjectsUseCase',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts#listSourceObjects'
  ),
  jsonb_build_array('docs/adr/ADR-0058-warehouse-source-import-rails.md'),
  jsonb_build_array('docs/architecture/command-query-rail-governance.md', 'docs/adr/ADR-0058-warehouse-source-import-rails.md'),
  jsonb_build_array('apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts', 'apps/web/src/app/services/workspace/workspacePorts.api.ts'),
  jsonb_build_array('No active source or documentation surface may expose ListWarehouseConnectionTables'),
  jsonb_build_array('pnpm planning:db:query command-query-rails --filter WarehouseConnection --limit 100'),
  'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql',
  repeat(md5('retire-list-warehouse-connection-tables:608'), 2),
  jsonb_build_object(
    'name', 'ListWarehouseConnectionTables',
    'type', 'query',
    'status', 'retired',
    'canonicalRail', 'ListWarehouseConnectionSourceObjects',
    'retirementReason', 'The provider-neutral SourceObject catalog replaces relational table vocabulary.'
  ),
  jsonb_build_object(
    'featureId', 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG',
    'mechanizationStatus', 'closed',
    'canonicalRail', 'ListWarehouseConnectionSourceObjects'
  ),
  1,
  'planning-db-migration',
  now(),
  now()
)
on conflict (rail_id) do update set
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

-- Register new implementation surfaces and symbols on the existing byte-size
-- feature rather than creating a parallel feature or rail.
with target_features(feature_id) as (
  values
    ('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'::text),
    ('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'::text)
),
new_refs(ref) as (
  values
    ('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts'::text),
    ('packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts'::text),
    ('apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts'::text),
    ('apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.test.ts'::text),
    ('apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx'::text),
    ('apps/web/src/app/components/metrics/metricEvidenceTokens.ts'::text),
    ('apps/web/src/app/components/metrics/MetricEvidenceHotspot.test.tsx'::text),
    ('tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql'::text)
),
new_symbols(path, name, owner, rails, tests) as (
  values
    ('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'ImportSourceObjectsRequestSchema', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', jsonb_build_array('ImportWarehouseSources'), jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts')),
    ('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'ImportSourceObjectsResultSchema', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', jsonb_build_array('ImportWarehouseSources'), jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts')),
    ('packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts', 'TestWarehouseConnectionResultSchema', 'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS', jsonb_build_array('TestWarehouseConnection'), jsonb_build_array('packages/@dvt/contracts/test/source-import/SourceImportOperations.v1.test.ts')),
    ('apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts', 'describeSourceObjectMetricEvidence', 'web.component.metrics.SourceObjectMetricEvidencePresenter', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary', 'RenderSourceImportCatalogView'), jsonb_build_array('apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.test.ts')),
    ('apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx', 'MetricEvidenceHotspot', 'web.component.metrics.MetricEvidenceHotspot', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary', 'RenderSourceImportCatalogView'), jsonb_build_array('apps/web/src/app/components/metrics/MetricEvidenceHotspot.test.tsx')),
    ('apps/web/src/app/components/metrics/metricEvidenceTokens.ts', 'metricEvidenceHotspotClasses', 'web.component.metrics.MetricEvidenceHotspot', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary', 'RenderSourceImportCatalogView'), jsonb_build_array('apps/web/src/app/components/metrics/MetricEvidenceHotspot.test.tsx'))
),
selected_manifests as (
  select distinct on (rails.feature_id)
    rails.feature_id,
    rails.raw_manifest
  from planning_query_store.feature_mechanization_local_rails rails
  join target_features targets using (feature_id)
  order by rails.feature_id, rails.updated_at desc
),
retained_symbols as (
  select manifest.feature_id, symbol
  from selected_manifests manifest
  cross join lateral jsonb_array_elements(coalesce(manifest.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
  where not (
    (symbol ->> 'path' = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts' and symbol ->> 'name' = 'graphNodeMetricHotspotClasses')
    or (symbol ->> 'path' = 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts' and symbol ->> 'name' in ('methodLabels', 'byteSizeBasisLabels', 'formatEvidenceDetail'))
  )
),
all_symbols as (
  select feature_id, symbol, 0 as priority from retained_symbols
  union all
  select
    target.feature_id,
    jsonb_build_object(
      'path', symbol.path,
      'name', symbol.name,
      'dddOwner', symbol.owner,
      'cqRails', symbol.rails,
      'unitTests', symbol.tests,
      'fowlerSignals', jsonb_build_array('Published Language', 'Presentation Model', 'Separated Presentation')
    ),
    10
  from target_features target
  cross join new_symbols symbol
),
deduplicated_symbols as (
  select distinct on (feature_id, symbol ->> 'path', symbol ->> 'name')
    feature_id,
    symbol
  from all_symbols
  where nullif(symbol ->> 'path', '') is not null
    and nullif(symbol ->> 'name', '') is not null
  order by feature_id, symbol ->> 'path', symbol ->> 'name', priority desc
),
symbol_arrays as (
  select feature_id, jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as symbols
  from deduplicated_symbols
  group by feature_id
),
reference_arrays as (
  select
    manifest.feature_id,
    jsonb_agg(to_jsonb(ref) order by ref) as refs
  from selected_manifests manifest
  cross join lateral (
    select distinct ref
    from (
      select jsonb_array_elements_text(coalesce(manifest.raw_manifest -> 'implementationRefs', '[]'::jsonb)) as ref
      union all
      select new_refs.ref from new_refs
    ) candidates
    where nullif(ref, '') is not null
  ) refs
  group by manifest.feature_id
),
final_manifests as (
  select
    manifest.feature_id,
    manifest.raw_manifest || jsonb_build_object(
      'symbols', symbols.symbols,
      'implementationRefs', refs.refs,
      'allowedImplementationSurfaces', refs.refs,
      'sourceObjectHardening', jsonb_build_object(
        'operationContract', 'CONTRACT-SOURCE-IMPORT-OPERATIONS-V1',
        'duplicateCatalogObjectsAccepted', false,
        'duplicateSelectionsAccepted', false,
        'opaquePhysicalIdentifiersPreserved', true,
        'compositeConstraintsPreserved', true,
        'metricObservationScopeRequired', true,
        'measuredAndEstimatedTonesDistinct', true
      )
    ) as raw_manifest,
    refs.refs
  from selected_manifests manifest
  join symbol_arrays symbols using (feature_id)
  join reference_arrays refs using (feature_id)
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = manifest.raw_manifest,
  implementation_refs = manifest.refs,
  allowed_implementation_surfaces = manifest.refs,
  source_path = 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql',
  source_content_sha256 = repeat(md5(rails.rail_id || ':source-import-hardening:608'), 2),
  revision = rails.revision + 1,
  updated_at = now()
from final_manifests manifest
where rails.feature_id = manifest.feature_id;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
